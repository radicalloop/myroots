import { mkdirSync } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../../../utils/ApiError';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_aws_access_key_id',
  'your_aws_secret_access_key',
  'your_bucket_name',
]);

export function isAwsConfigured(configService: ConfigService): boolean {
  const accessKey = configService.get<string>('AWS_ACCESS_KEY_ID')?.trim() ?? '';
  const secretKey =
    configService.get<string>('AWS_SECRET_ACCESS_KEY')?.trim() ?? '';
  const bucket =
    (
      configService.get<string>('AWS_BUCKET_NAME') ??
      configService.get<string>('AWS_S3_BUCKET')
    )?.trim() ?? '';

  if (
    PLACEHOLDER_VALUES.has(accessKey) ||
    PLACEHOLDER_VALUES.has(secretKey) ||
    PLACEHOLDER_VALUES.has(bucket)
  ) {
    return false;
  }

  return Boolean(accessKey && secretKey && bucket);
}

export function validateImageContentType(contentType: string): void {
  const allowed: readonly string[] = ALLOWED_IMAGE_TYPES;
  if (!allowed.includes(contentType.toLowerCase())) {
    throw new ApiError(
      400,
      'Only image files are allowed (jpeg, png, webp, gif)',
    );
  }
}

export function extensionFromContentType(contentType: string): string {
  return contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
}

export function buildProfileImageKey(
  treeId: string,
  personId: string,
  contentType: string,
): string {
  const ext = extensionFromContentType(contentType);
  return `trees/${treeId}/persons/${personId}/${uuidv4()}.${ext}`;
}

export function buildChatImageKey(
  treeId: string,
  userId: string,
  contentType: string,
): string {
  const ext = extensionFromContentType(contentType);
  return `chat-images/${treeId}/${userId}/${uuidv4()}.${ext}`;
}

export function getMaxImageSizeBytes(configService: ConfigService): number {
  const mb = Number(configService.get('PROFILE_IMAGE_MAX_SIZE_MB') ?? 5);
  return mb * 1024 * 1024;
}

export function resolveLocalUploadDir(configService: ConfigService): string {
  const configured = configService.get<string>('LOCAL_UPLOAD_DIR')?.trim();
  const root = configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), 'temp', 'uploads');

  mkdirSync(root, { recursive: true });
  return root;
}

export function contentTypeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export function resolveSafeLocalPath(rootDir: string, key: string): string {
  const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(rootDir, normalizedKey);
  const resolvedRoot = path.resolve(rootDir);

  if (
    fullPath !== resolvedRoot &&
    !fullPath.startsWith(resolvedRoot + path.sep)
  ) {
    throw new ApiError(400, 'Invalid object path');
  }

  return fullPath;
}
