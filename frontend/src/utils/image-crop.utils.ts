export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPosition {
  x: number;
  y: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    image.src = src;
  });
}

export function getRenderedImageSize(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  zoom: number,
): { width: number; height: number } {
  const scale = Math.max(cropSize / naturalWidth, cropSize / naturalHeight) * zoom;

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

export function computeCropArea(
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  zoom: number,
  position: CropPosition,
): CropArea {
  const { width: renderedWidth, height: renderedHeight } = getRenderedImageSize(
    naturalWidth,
    naturalHeight,
    cropSize,
    zoom,
  );

  const offsetX = (cropSize - renderedWidth) / 2 + position.x;
  const offsetY = (cropSize - renderedHeight) / 2 + position.y;
  const scaleX = naturalWidth / renderedWidth;
  const scaleY = naturalHeight / renderedHeight;

  const cropX = -offsetX * scaleX;
  const cropY = -offsetY * scaleY;
  const cropWidth = cropSize * scaleX;
  const cropHeight = cropSize * scaleY;

  return {
    x: Math.max(0, Math.min(cropX, naturalWidth)),
    y: Math.max(0, Math.min(cropY, naturalHeight)),
    width: Math.min(cropWidth, naturalWidth - Math.max(0, cropX)),
    height: Math.min(cropHeight, naturalHeight - Math.max(0, cropY)),
  };
}

export async function getCroppedImageFile(
  imageSrc: string,
  cropArea: CropArea,
  fileName: string,
  mimeType: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const outputSize = Math.round(Math.min(cropArea.width, cropArea.height));
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error('Failed to crop image'));
      },
      mimeType,
      0.92,
    );
  });

  return new File([blob], fileName, { type: mimeType });
}
