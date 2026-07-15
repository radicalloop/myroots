import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ImageUploadProps {
  onUpload: (file: File) => void;
  onDelete?: () => void;
  hasImage?: boolean;
  loading?: boolean;
  variant?: 'default' | 'compact';
}

export function ImageUpload({
  onUpload,
  onDelete,
  hasImage,
  loading,
  variant = 'default',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    onUpload(file);
    e.target.value = '';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleChange}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-brand-600 transition-colors duration-150 hover:text-brand-700 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : hasImage ? 'Change photo' : 'Add photo'}
        </button>
        {hasImage && onDelete && (
          <>
            <span className="text-border-soft">·</span>
            <button
              type="button"
              disabled={loading}
              onClick={onDelete}
              className="text-sm font-medium text-text-muted transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
            >
              Remove
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        onClick={() => inputRef.current?.click()}
      >
        {hasImage ? 'Replace photo' : 'Upload photo'}
      </Button>
      {hasImage && onDelete && (
        <Button type="button" variant="danger" onClick={onDelete} loading={loading}>
          Remove photo
        </Button>
      )}
    </div>
  );
}
