import { useEffect, useRef, useState } from 'react';
import { Camera, Crop, ImagePlus, Trash2, Upload } from 'lucide-react';
import clsx from 'clsx';
import { ImageCropModal } from '@/components/ImageCrop/ImageCropModal';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROFILE_IMAGE_ACCEPT } from '@/constants/image.constants';
import { usePersonImageUrl } from '@/hooks/api/usePersonImageUrl';
import {
  getProfileImageFileMeta,
  validateProfileImageFile,
} from '@/utils/image-validation.utils';

interface ProfilePhotoSectionProps {
  treeId: string;
  personId: string;
  firstName: string;
  lastName: string;
  profileImagePath: string | null;
  canEdit?: boolean;
  uploading?: boolean;
  deleting?: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

interface PendingCrop {
  src: string;
  fileName: string;
  mimeType: string;
  revokeOnClose: boolean;
}

const avatarSizeClass = 'h-16 w-16 text-base';

export function ProfilePhotoSection({
  treeId,
  personId,
  firstName,
  lastName,
  profileImagePath,
  canEdit = true,
  uploading,
  deleting,
  onUpload,
  onDelete,
}: ProfilePhotoSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const hasImage = Boolean(profileImagePath);
  const isBusy = Boolean(uploading || deleting);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const {
    data: serverImageUrl,
    isLoading: isServerImageLoading,
    isError: isServerImageError,
  } = usePersonImageUrl({
    treeId,
    personId,
    profileImagePath,
  });

  const displayUrl = localPreviewUrl ?? serverImageUrl ?? null;
  const showImage = Boolean(displayUrl) && !isServerImageError;
  const showSkeleton =
    !localPreviewUrl && Boolean(profileImagePath) && isServerImageLoading;

  useEffect(() => {
    setMenuOpen(false);
    setPendingCrop((current) => {
      if (current?.revokeOnClose && current.src.startsWith('blob:')) {
        URL.revokeObjectURL(current.src);
      }
      return null;
    });
    setLocalPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [personId]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const openFilePicker = () => {
    if (isBusy) return;
    inputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !validateProfileImageFile(file)) return;

    const src = URL.createObjectURL(file);
    setPendingCrop({
      src,
      fileName: file.name,
      mimeType: file.type,
      revokeOnClose: true,
    });
    setMenuOpen(false);
  };

  const handleAdjustPhoto = () => {
    if (isBusy || !displayUrl || !profileImagePath) return;

    const { fileName, mimeType } = getProfileImageFileMeta(profileImagePath);

    setPendingCrop({
      src: displayUrl,
      fileName,
      mimeType,
      revokeOnClose: false,
    });
    setMenuOpen(false);
  };

  const closeCropModal = () => {
    if (pendingCrop?.revokeOnClose && pendingCrop.src.startsWith('blob:')) {
      URL.revokeObjectURL(pendingCrop.src);
    }
    setPendingCrop(null);
  };

  const handleCropSave = (file: File) => {
    if (localPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    setLocalPreviewUrl(URL.createObjectURL(file));
    closeCropModal();
    onUpload(file);
  };

  const handleDelete = () => {
    if (isBusy) return;

    if (localPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }

    setMenuOpen(false);
    onDelete();
  };

  const renderAvatar = () => {
    if (showSkeleton) {
      return <Skeleton className={clsx('rounded-full', avatarSizeClass)} />;
    }

    if (showImage && displayUrl) {
      return (
        <img
          src={displayUrl}
          alt={`${firstName} ${lastName}`}
          className={clsx(
            'rounded-full object-cover ring-2 ring-white shadow-sm',
            avatarSizeClass,
          )}
        />
      );
    }

    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-semibold text-brand-700 shadow-sm ring-2 ring-white',
          avatarSizeClass,
        )}
      >
        {initials}
      </div>
    );
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFileSelected}
      />

      {canEdit ? (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isBusy}
              className="group relative mx-auto block rounded-full bg-white p-0.5 shadow-sm ring-2 ring-white/80 transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-70"
              aria-label="Manage profile photo"
            >
              {renderAvatar()}

              <span className="absolute inset-1 flex items-center justify-center rounded-full bg-text-primary/0 transition-colors group-hover:bg-text-primary/35 group-focus-visible:bg-text-primary/35">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-brand-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="h-3 w-3" aria-hidden="true" />
                </span>
              </span>

              {isBusy && (
                <span
                  className={clsx(
                    'absolute inset-1 flex items-center justify-center rounded-full',
                    displayUrl ? 'bg-white/40' : 'bg-white/75',
                  )}
                >
                  <Spinner size="md" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="center" className="w-48">
            {hasImage ? (
              <DropdownMenuItem
                onSelect={openFilePicker}
                disabled={isBusy}
                className="gap-2"
              >
                <ImagePlus className="h-4 w-4" />
                Change photo
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={openFilePicker}
                disabled={isBusy}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload photo
              </DropdownMenuItem>
            )}

            {hasImage && (
              <>
                <DropdownMenuItem
                  onSelect={handleAdjustPhoto}
                  disabled={isBusy || !displayUrl}
                  className="gap-2"
                >
                  <Crop className="h-4 w-4" />
                  Adjust photo
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={handleDelete}
                  disabled={isBusy}
                  className={clsx(
                    'gap-2 text-red-600 focus:bg-red-50 focus:text-red-700',
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Removing...' : 'Remove photo'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="relative mx-auto block rounded-full bg-white p-0.5 shadow-sm ring-2 ring-white/80">
          {renderAvatar()}
        </div>
      )}

      {pendingCrop && (
        <ImageCropModal
          open
          imageSrc={pendingCrop.src}
          fileName={pendingCrop.fileName}
          mimeType={pendingCrop.mimeType}
          saving={uploading}
          onCancel={closeCropModal}
          onSave={handleCropSave}
        />
      )}
    </>
  );
}
