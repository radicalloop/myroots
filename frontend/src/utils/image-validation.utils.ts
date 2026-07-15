import { toast } from 'sonner';
import {
  PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_MAX_SIZE_MB,
  PROFILE_IMAGE_TYPES,
} from '@/constants/image.constants';

export function validateProfileImageFile(file: File): boolean {
  if (!PROFILE_IMAGE_TYPES.includes(file.type as (typeof PROFILE_IMAGE_TYPES)[number])) {
    toast.error('Only JPG, JPEG, PNG, and WebP images are allowed');
    return false;
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
    toast.error(`Image must be smaller than ${PROFILE_IMAGE_MAX_SIZE_MB} MB`);
    return false;
  }

  return true;
}

export function normalizeProfileImageMimeType(mimeType: string): string {
  if (mimeType === 'image/jpg') {
    return 'image/jpeg';
  }

  return mimeType;
}

const PROFILE_IMAGE_EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getProfileImageFileMeta(profileImagePath: string): {
  fileName: string;
  mimeType: string;
} {
  const fileName = profileImagePath.split('/').pop() ?? 'profile.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';

  return {
    fileName,
    mimeType: PROFILE_IMAGE_EXTENSION_MIME[extension] ?? 'image/jpeg',
  };
}
