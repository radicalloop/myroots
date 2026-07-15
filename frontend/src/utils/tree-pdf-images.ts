import {
  fetchPersonImageBlob,
  fetchPublicPersonImageBlob,
} from '@/api/family-tree.api';

const AVATAR_CANVAS_SIZE = 224;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

export async function fetchImageDataUrl(
  treeId: string,
  personId: string,
  profileImagePath: string,
  isPublic: boolean,
): Promise<string | null> {
  try {
    const fetcher = isPublic
      ? fetchPublicPersonImageBlob
      : fetchPersonImageBlob;
    const response = await fetcher(treeId, personId, profileImagePath);
    return await blobToDataUrl(response.data as Blob);
  } catch {
    return null;
  }
}

export function createCircularCroppedDataUrl(
  sourceDataUrl: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_CANVAS_SIZE;
      canvas.height = AVATAR_CANVAS_SIZE;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.beginPath();
      ctx.arc(
        AVATAR_CANVAS_SIZE / 2,
        AVATAR_CANVAS_SIZE / 2,
        AVATAR_CANVAS_SIZE / 2,
        0,
        Math.PI * 2,
      );
      ctx.clip();

      const scale = Math.max(
        AVATAR_CANVAS_SIZE / img.naturalWidth,
        AVATAR_CANVAS_SIZE / img.naturalHeight,
      );
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = (AVATAR_CANVAS_SIZE - dw) / 2;
      const dy = (AVATAR_CANVAS_SIZE - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      resolve(canvas.toDataURL('image/png'));
    });

    img.addEventListener('error', () => resolve(null));
    img.src = sourceDataUrl;
  });
}
