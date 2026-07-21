import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ApiError } from '../../utils/ApiError';
import {
  contentTypeFromKey,
  resolveLocalUploadDir,
  resolveSafeLocalPath,
  validateImageContentType,
} from './helpers/storage.helper';

export class LocalStorageDriver {
  private readonly rootDir: string;

  constructor(configService: ConfigService) {
    this.rootDir = resolveLocalUploadDir(configService);
  }

  getRootDir(): string {
    return this.rootDir;
  }

  async generateUploadSignedUrl(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; objectPath: string }> {
    validateImageContentType(contentType);
    void key;

    throw new ApiError(
      400,
      'Presigned upload requires AWS S3. Use the direct upload endpoint instead.',
    );
  }

  async generateReadSignedUrl(key: string): Promise<string> {
    return this.getReadableImageUrl(key);
  }

  async getReadableImageUrl(key: string): Promise<string> {
    const filePath = resolveSafeLocalPath(this.rootDir, key);
    const buffer = await fs.readFile(filePath);
    const contentType = contentTypeFromKey(key);
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await fs.access(resolveSafeLocalPath(this.rootDir, key));
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

    const filePath = resolveSafeLocalPath(this.rootDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await fs.unlink(resolveSafeLocalPath(this.rootDir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getObjectStream(
    key: string,
  ): Promise<{ body: NodeJS.ReadableStream; contentType: string }> {
    const filePath = resolveSafeLocalPath(this.rootDir, key);

    try {
      await fs.access(filePath);
    } catch {
      throw new ApiError(404, 'Image file not found in storage');
    }

    return {
      body: createReadStream(filePath),
      contentType: contentTypeFromKey(key),
    };
  }

  async deleteChatImagesOlderThan(cutoff: Date): Promise<number> {
    const chatRoot = path.join(this.rootDir, 'chat-images');

    try {
      await fs.access(chatRoot);
    } catch {
      return 0;
    }

    return this.deleteOldFilesRecursive(chatRoot, cutoff);
  }

  private async deleteOldFilesRecursive(
    dir: string,
    cutoff: Date,
  ): Promise<number> {
    let deleted = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        deleted += await this.deleteOldFilesRecursive(fullPath, cutoff);
        continue;
      }

      if (!entry.isFile()) continue;

      const stats = await fs.stat(fullPath);
      if (stats.mtime >= cutoff) continue;

      await fs.unlink(fullPath);
      deleted += 1;
    }

    return deleted;
  }
}
