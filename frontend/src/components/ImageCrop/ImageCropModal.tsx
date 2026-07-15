import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  computeCropArea,
  getCroppedImageFile,
  getRenderedImageSize,
  type CropPosition,
} from '@/utils/image-crop.utils';
import { normalizeProfileImageMimeType } from '@/utils/image-validation.utils';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  fileName: string;
  mimeType: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
}

const CROP_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export function ImageCropModal({
  open,
  imageSrc,
  fileName,
  mimeType,
  saving,
  onCancel,
  onSave,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const dragState = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    if (!open) return;

    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      event.stopPropagation();
      event.preventDefault();
      onCancel();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onCancel, saving]);

  const clampPosition = useCallback(
    (next: CropPosition, nextZoom: number) => {
      if (!naturalSize.width || !naturalSize.height) return next;

      const { width, height } = getRenderedImageSize(
        naturalSize.width,
        naturalSize.height,
        CROP_SIZE,
        nextZoom,
      );

      const maxX = Math.max(0, (width - CROP_SIZE) / 2);
      const maxY = Math.max(0, (height - CROP_SIZE) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [naturalSize.height, naturalSize.width],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (saving) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active || saving) return;

    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;

    setPosition(
      clampPosition(
        {
          x: dragState.current.originX + deltaX,
          y: dragState.current.originY + deltaY,
        },
        zoom,
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleZoomChange = (nextZoom: number) => {
    const boundedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(boundedZoom);
    setPosition((current) => clampPosition(current, boundedZoom));
  };

  const handleSave = async () => {
    if (!naturalSize.width || !naturalSize.height || saving) return;

    const cropArea = computeCropArea(
      naturalSize.width,
      naturalSize.height,
      CROP_SIZE,
      zoom,
      position,
    );

    const croppedFile = await getCroppedImageFile(
      imageSrc,
      cropArea,
      fileName,
      normalizeProfileImageMimeType(mimeType),
    );

    onSave(croppedFile);
  };

  if (!open) return null;

  const renderedSize =
    naturalSize.width > 0
      ? getRenderedImageSize(
          naturalSize.width,
          naturalSize.height,
          CROP_SIZE,
          zoom,
        )
      : { width: CROP_SIZE, height: CROP_SIZE };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-text-primary/50 backdrop-blur-sm"
        aria-label="Close crop dialog"
        onClick={saving ? undefined : onCancel}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[var(--radius-card)] bg-white shadow-[var(--shadow-modal)] sm:rounded-[var(--radius-card)]">
        <div className="border-b border-border-subtle px-6 py-5">
          <h3
            id="crop-modal-title"
            className="text-lg font-semibold tracking-tight text-text-primary"
          >
            Adjust photo
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Drag to reposition and use the slider to zoom. Your photo will be
            saved as a circular avatar.
          </p>
        </div>

        <div className="px-6 py-5">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-full bg-warm-100 shadow-inner ring-4 ring-brand-100"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: renderedSize.width,
                height: renderedSize.height,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }}
              onLoad={(event) => {
                const image = event.currentTarget;
                setNaturalSize({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                });
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/90"
              aria-hidden="true"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-text-muted transition-colors hover:bg-warm-50 hover:text-text-secondary disabled:opacity-50"
              onClick={() => handleZoomChange(zoom - 0.1)}
              disabled={saving || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={saving}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-brand-100 accent-brand-600"
              aria-label="Zoom"
            />

            <button
              type="button"
              className="rounded-xl p-2 text-text-muted transition-colors hover:bg-warm-50 hover:text-text-secondary disabled:opacity-50"
              onClick={() => handleZoomChange(zoom + 0.1)}
              disabled={saving || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 border-t border-border-subtle bg-warm-50/50 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={saving}
            disabled={!naturalSize.width || !naturalSize.height}
            onClick={() => void handleSave()}
          >
            Save photo
          </Button>
        </div>
      </div>
    </div>
  );
}
