import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageDriver } from './local-storage.driver';
import { S3StorageDriver } from './s3-storage.driver';
import {
  buildChatImageKey,
  buildProfileImageKey,
  getMaxImageSizeBytes,
  isAwsConfigured,
  validateImageContentType,
} from './helpers/storage.helper';

type StorageDriver = S3StorageDriver | LocalStorageDriver;

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly driver: StorageDriver;
  private readonly useS3: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useS3 = isAwsConfigured(configService);

    if (this.useS3) {
      this.driver = new S3StorageDriver(configService);
      this.logger.log('Image storage: AWS S3');
    } else {
      const local = new LocalStorageDriver(configService);
      this.driver = local;
      this.logger.log(
        `Image storage: local (${local.getRootDir()}) — AWS credentials not configured`,
      );
    }
  }

  isUsingS3(): boolean {
    return this.useS3;
  }

  validateImageContentType(contentType: string): void {
    validateImageContentType(contentType);
  }

  buildProfileImageKey(
    treeId: string,
    personId: string,
    contentType: string,
  ): string {
    return buildProfileImageKey(treeId, personId, contentType);
  }

  buildChatImageKey(
    treeId: string,
    userId: string,
    contentType: string,
  ): string {
    return buildChatImageKey(treeId, userId, contentType);
  }

  getMaxImageSizeBytes(): number {
    return getMaxImageSizeBytes(this.configService);
  }

  getReadableImageUrl(key: string): Promise<string> {
    return this.driver.getReadableImageUrl(key);
  }

  deleteChatImagesOlderThan(cutoff: Date): Promise<number> {
    return this.driver.deleteChatImagesOlderThan(cutoff);
  }

  generateUploadSignedUrl(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; objectPath: string }> {
    return this.driver.generateUploadSignedUrl(key, contentType);
  }

  generateReadSignedUrl(key: string): Promise<string> {
    return this.driver.generateReadSignedUrl(key);
  }

  objectExists(key: string): Promise<boolean> {
    return this.driver.objectExists(key);
  }

  uploadObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    return this.driver.uploadObject(key, body, contentType);
  }

  deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }

  getObjectStream(
    key: string,
  ): Promise<{ body: NodeJS.ReadableStream; contentType: string }> {
    return this.driver.getObjectStream(key);
  }
}
