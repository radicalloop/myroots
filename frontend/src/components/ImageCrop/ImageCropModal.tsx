import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  computeCropArea,
  getCroppedImageFile,
  getRenderedImageSize,
  type CropPosition,
} from "@/utils/image-crop.utils";
import { normalizeProfileImageMimeType } from "@/utils/image-validation.utils";

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  fileName: string;
  mimeType: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
}

const DESKTOP_MAX_CROP_SIZE = 280;
const MOBILE_MAX_CROP_SIZE = 208;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function getResponsiveCropSize(): number {
  if (typeof window === "undefined") return DESKTOP_MAX_CROP_SIZE;

  const isMobile = window.innerWidth < 640;
  const maxSize = isMobile ? MOBILE_MAX_CROP_SIZE : DESKTOP_MAX_CROP_SIZE;
  const horizontalPadding = isMobile ? 56 : 48;

  return Math.min(maxSize, window.innerWidth - horizontalPadding);
}

export function ImageCropModal({
  open,
  imageSrc,
  fileName,
  mimeType,
  saving,
  onCancel,
  onSave,
}: ImageCropModalProps) {
  const [cropSize, setCropSize] = useState(DESKTOP_MAX_CROP_SIZE);
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

    const updateCropSize = () => {
      setCropSize(getResponsiveCropSize());
    };

    updateCropSize();
    window.addEventListener("resize", updateCropSize);
    return () => window.removeEventListener("resize", updateCropSize);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
  }, [open, imageSrc, cropSize]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      event.stopPropagation();
      event.preventDefault();
      onCancel();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onCancel, saving]);

  const clampPosition = useCallback(
    (next: CropPosition, nextZoom: number) => {
      if (!naturalSize.width || !naturalSize.height) return next;

      const { width, height } = getRenderedImageSize(
        naturalSize.width,
        naturalSize.height,
        cropSize,
        nextZoom,
      );

      const maxX = Math.max(0, (width - cropSize) / 2);
      const maxY = Math.max(0, (height - cropSize) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [cropSize, naturalSize.height, naturalSize.width],
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
      cropSize,
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
          cropSize,
          zoom,
        )
      : { width: cropSize, height: cropSize };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
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

      <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[18.5rem] flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-modal)] sm:max-h-[min(88vh,724px)] sm:max-w-md">
        <div className="border-b border-border-subtle px-3 py-3 sm:px-6 sm:py-5">
          <h3
            id="crop-modal-title"
            className="text-base font-semibold tracking-tight text-text-primary sm:text-lg"
          >
            Adjust photo
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary sm:mt-1 sm:text-sm">
            Drag to reposition and use the slider to zoom. Your photo will be
            saved as a circular avatar.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-full bg-warm-100 shadow-inner ring-2 ring-brand-100 sm:ring-4"
            style={{ width: cropSize, height: cropSize }}
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

          <div className="mt-3 flex items-center gap-2 sm:mt-5 sm:gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-warm-50 hover:text-text-secondary disabled:opacity-50 sm:rounded-xl sm:p-2"
              onClick={() => handleZoomChange(zoom - 0.1)}
              disabled={saving || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={saving}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-brand-100 accent-brand-600 sm:h-1.5"
              aria-label="Zoom"
            />

            <button
              type="button"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-warm-50 hover:text-text-secondary disabled:opacity-50 sm:rounded-xl sm:p-2"
              onClick={() => handleZoomChange(zoom + 0.1)}
              disabled={saving || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border-subtle bg-warm-50/50 px-3 py-3 sm:gap-2.5 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1 sm:h-10 sm:px-4 sm:text-sm"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 sm:h-10 sm:px-4 sm:text-sm"
            loading={saving}
            disabled={!naturalSize.width || !naturalSize.height}
            onClick={() => void handleSave()}
          >
            Save photo
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
