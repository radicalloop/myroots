import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ApiError } from '../../utils/ApiError';
import { validateImageContentType } from './helpers/storage.helper';

export class S3StorageDriver {
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  async getReadableImageUrl(key: string): Promise<string> {
    const publicBaseUrl = this.configService.get<string>(
      'AWS_S3_PUBLIC_BASE_URL',
    );

    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return this.generateReadSignedUrl(key);
  }

  async deleteChatImagesOlderThan(cutoff: Date): Promise<number> {
    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const response = await this.getClient().send(
        new ListObjectsV2Command({
          Bucket: this.getBucketName(),
          Prefix: 'chat-images/',
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key || !object.LastModified) continue;
        if (object.LastModified >= cutoff) continue;

        await this.deleteObject(object.Key);
        deleted += 1;
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return deleted;
  }

  async generateUploadSignedUrl(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; objectPath: string }> {
    validateImageContentType(contentType);

    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.getClient(), command, {
      expiresIn: this.getUploadSignedUrlExpiresIn(),
      signableHeaders: new Set(['content-type']),
      unhoistableHeaders: new Set(['content-type']),
    });

    return { uploadUrl, objectPath: key };
  }

  async generateReadSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
    });

    return getSignedUrl(this.getClient(), command, {
      expiresIn: this.getReadSignedUrlExpiresIn(),
    });
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.getClient().send(
        new HeadObjectCommand({
          Bucket: this.getBucketName(),
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async uploadObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    validateImageContentType(contentType);

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getBucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.getBucketName(),
        Key: key,
      }),
    );
  }

  async getObjectStream(
    key: string,
  ): Promise<{ body: NodeJS.ReadableStream; contentType: string }> {
    const response = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.getBucketName(),
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new ApiError(404, 'Image file not found in storage');
    }

    return {
      body: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  private getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.configService.get('AWS_REGION') ?? 'us-east-1',
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') ?? '',
          secretAccessKey:
            this.configService.get('AWS_SECRET_ACCESS_KEY') ?? '',
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }

  private getBucketName(): string {
    const bucket =
      this.configService.get('AWS_BUCKET_NAME') ??
      this.configService.get('AWS_S3_BUCKET');
    if (!bucket) {
      throw new ApiError(500, 'S3 bucket is not configured');
    }
    return bucket;
  }

  private getUploadSignedUrlExpiresIn(): number {
    return Number(
      this.configService.get('AWS_SIGNED_URL_EXPIRES_IN_SECONDS') ?? 300,
    );
  }

  private getReadSignedUrlExpiresIn(): number {
    return Number(
      this.configService.get('AWS_READ_URL_EXPIRES_IN_SECONDS') ??
        this.configService.get('AWS_SIGNED_URL_EXPIRES_IN_SECONDS') ??
        3600,
    );
  }
}
