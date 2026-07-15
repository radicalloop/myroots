import { useCallback, useRef, useState } from 'react';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export function useImageDrop(onFile: (file: File) => void) {
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);

  const getImageFile = useCallback(
    (dataTransfer: DataTransfer): File | null => {
      const file = dataTransfer.files[0];
      if (!file) return null;
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return null;
      return file;
    },
    [],
  );

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;

    const file = getImageFile(event.dataTransfer);
    if (file) {
      setDragActive(true);
    }
  }, [getImageFile]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;

    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current = 0;
      setDragActive(false);

      const file = getImageFile(event.dataTransfer);
      if (file) {
        onFile(file);
      }
    },
    [getImageFile, onFile],
  );

  return { dragActive, onDragEnter, onDragOver, onDragLeave, onDrop };
}
