import { ApiError } from '../../../utils/ApiError';
import { S3Service } from '../../storage/s3.service';

export interface ChatImageUploadInput {
  data: string;
  content_type: string;
}

export async function uploadChatImageToS3(
  s3Service: S3Service,
  treeId: string,
  userId: string,
  image: ChatImageUploadInput,
): Promise<string> {
  const buffer = Buffer.from(image.data, 'base64');
  const maxBytes = s3Service.getMaxImageSizeBytes();

  if (buffer.length > maxBytes) {
    throw new ApiError(400, 'Image is too large');
  }

  const key = s3Service.buildChatImageKey(
    treeId,
    userId,
    image.content_type,
  );

  await s3Service.uploadObject(key, buffer, image.content_type);

  return await s3Service.getReadableImageUrl(key);
}
