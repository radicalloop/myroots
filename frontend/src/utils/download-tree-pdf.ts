import { getNodesBounds, type Node } from '@xyflow/react';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Maximum safe canvas/page dimension in pixels/points.
 * Browsers and PDF viewers become unreliable beyond ~14400 units
 * (Chrome canvas limit is 16384, PDF spec allows 14400).
 * If the tree exceeds this, content is scaled down proportionally.
 */
const SAFE_MAX_DIMENSION = 12000;

/** Extra padding around the tree bounds, as a fraction of content size. */
const BOUNDS_PADDING = 0.12;

/** Minimum padding in pixels regardless of tree size. */
const MIN_PADDING_PX = 80;

const IMAGE_LOAD_TIMEOUT_MS = 8000;
const LAYOUT_SETTLE_FRAMES = 2;

export function sanitizePdfFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return cleaned || 'family-tree';
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      image.removeEventListener('load', handleDone);
      image.removeEventListener('error', handleDone);
      resolve();
    };

    const handleDone = () => cleanup();
    const timeoutId = window.setTimeout(handleDone, IMAGE_LOAD_TIMEOUT_MS);

    image.addEventListener('load', handleDone, { once: true });
    image.addEventListener('error', handleDone, { once: true });
  });
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForLayout(): Promise<void> {
  for (let i = 0; i < LAYOUT_SETTLE_FRAMES; i += 1) {
    await waitForAnimationFrame();
  }

  await document.fonts?.ready;
}

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

async function imageToDataUrl(image: HTMLImageElement): Promise<string | null> {
  await waitForImage(image);

  const src = image.currentSrc || image.src;
  if (!src || image.naturalWidth === 0) return null;
  if (src.startsWith('data:')) return src;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    }
  } catch {
    // Fall back to fetching the image source below.
  }

  try {
    const response = await fetch(src);
    if (!response.ok) return null;

    return await blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

function initialsFromAltText(altText: string): string {
  const words = altText.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

  return initials.toUpperCase() || '?';
}

function replaceImageWithFallback(image: HTMLImageElement): void {
  const fallback = document.createElement('div');
  fallback.dataset.treeAvatar = '';
  fallback.textContent = initialsFromAltText(image.alt);
  fallback.className =
    'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-semibold text-brand-700 shadow-sm ring-2 ring-white';

  Object.assign(fallback.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${image.width || image.naturalWidth || 64}px`,
    height: `${image.height || image.naturalHeight || 64}px`,
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
    color: '#047857',
    fontWeight: '600',
  });

  image.replaceWith(fallback);
}

async function embedAvatarImages(
  sourceElement: HTMLElement,
  cloneElement: HTMLElement,
): Promise<void> {
  const sourceImages = Array.from(
    sourceElement.querySelectorAll<HTMLImageElement>('img[data-tree-avatar]'),
  );
  const cloneImages = Array.from(
    cloneElement.querySelectorAll<HTMLImageElement>('img[data-tree-avatar]'),
  );

  await Promise.all(
    sourceImages.map(async (sourceImage, index) => {
      const cloneImage = cloneImages[index];
      if (!cloneImage) return;

      const dataUrl = await imageToDataUrl(sourceImage);
      if (dataUrl) {
        cloneImage.src = dataUrl;
        cloneImage.removeAttribute('crossorigin');
      } else {
        replaceImageWithFallback(cloneImage);
      }
    }),
  );

  await Promise.all(cloneImages.map(waitForImage));
}

interface Bounds {
  width: number;
  height: number;
}

function computeExportBounds(nodes: Node[]): Bounds {
  if (nodes.length === 0) {
    return { width: 1920, height: 1080 };
  }

  const bounds = getNodesBounds(nodes);

  const paddingX = Math.max(MIN_PADDING_PX, bounds.width * BOUNDS_PADDING);
  const paddingY = Math.max(MIN_PADDING_PX, bounds.height * BOUNDS_PADDING);

  return {
    width: Math.ceil(bounds.width + paddingX * 2),
    height: Math.ceil(bounds.height + paddingY * 2),
  };
}

interface ExportElements {
  wrapper: HTMLElement;
  clone: HTMLElement;
}

/**
 * Creates a clone of the ReactFlow DOM positioned at origin (0,0)
 * so the tree renders at its natural scale. Hides interactive chrome
 * and sets dimensions to match the actual tree bounds.
 */
function prepareExportClone(
  flowElement: HTMLElement,
  nodes: Node[],
  bounds: Bounds,
): ExportElements {
  const wrapper = document.createElement('div');
  const clone = flowElement.cloneNode(true) as HTMLElement;

  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: '0',
    zIndex: '2147483647',
  });

  Object.assign(clone.style, {
    position: 'relative',
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    minHeight: `${bounds.height}px`,
    overflow: 'hidden',
    borderRadius: '0',
  });

  const reactFlowElement = clone.matches('.react-flow')
    ? clone
    : clone.querySelector<HTMLElement>('.react-flow');

  if (reactFlowElement) {
    Object.assign(reactFlowElement.style, {
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    });
  }

  // Reset viewport transform: show the tree at natural scale with the bounding offset.
  // The tree nodes are positioned absolutely within the viewport,
  // so we offset by the negative min position to align at (0,0).
  const boundsRect = getNodesBounds(nodes);
  const paddingX = Math.max(MIN_PADDING_PX, boundsRect.width * BOUNDS_PADDING);
  const paddingY = Math.max(MIN_PADDING_PX, boundsRect.height * BOUNDS_PADDING);

  const offsetX = -(boundsRect.x - paddingX);
  const offsetY = -(boundsRect.y - paddingY);

  const viewportElement =
    clone.querySelector<HTMLElement>('.react-flow__viewport');

  if (viewportElement) {
    viewportElement.style.transform =
      `translate(${offsetX}px, ${offsetY}px) scale(1)`;
  }

  // Remove interactive chrome.
  clone
    .querySelectorAll(
      [
        '.tree-zoom-controls',
        '.react-flow__controls',
        '.react-flow__minimap',
        '.react-flow__attribution',
        '.react-flow__resize-control',
        '.react-flow__panel',
      ].join(','),
    )
    .forEach((element) => element.remove());

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return { wrapper, clone };
}

interface PdfDimensions {
  pageWidth: number;
  pageHeight: number;
  scale: number;
}

function computePdfDimensions(bounds: Bounds): PdfDimensions {
  const maxDim = Math.max(bounds.width, bounds.height);

  if (maxDim <= SAFE_MAX_DIMENSION) {
    return { pageWidth: bounds.width, pageHeight: bounds.height, scale: 1 };
  }

  const scale = SAFE_MAX_DIMENSION / maxDim;
  return {
    pageWidth: Math.ceil(bounds.width * scale),
    pageHeight: Math.ceil(bounds.height * scale),
    scale,
  };
}

export async function downloadTreeAsPdf(
  flowElement: HTMLElement,
  nodes: Node[],
  treeName: string,
): Promise<void> {
  if (nodes.length === 0) {
    throw new Error('No nodes to export');
  }

  // Stage 1: compute bounds
  console.log('[PDF Export] Computing node bounds for', nodes.length, 'nodes');
  const bounds = computeExportBounds(nodes);
  console.log(
    '[PDF Export] Tree bounds:',
    bounds.width,
    '×',
    bounds.height,
    'px',
  );

  // Stage 2: prepare clone
  const { wrapper, clone } = prepareExportClone(flowElement, nodes, bounds);

  try {
    // Stage 3: wait for layout and embed images
    console.log('[PDF Export] Waiting for layout...');
    await waitForLayout();

    console.log('[PDF Export] Embedding avatar images...');
    await embedAvatarImages(flowElement, clone);

    console.log('[PDF Export] Waiting for final layout...');
    await waitForLayout();

    // Stage 4: compute PDF dimensions
    const { pageWidth, pageHeight, scale } = computePdfDimensions(bounds);
    console.log(
      '[PDF Export] PDF page:',
      pageWidth,
      '×',
      pageHeight,
      'pt, scale:',
      scale,
    );

    // Stage 5: render to canvas (avoids SVG foreignObject bug with complex DOM)
    console.log('[PDF Export] Rendering to canvas...');
    const rWidth = bounds.width;
    const rHeight = bounds.height;
    const pixelRatio = scale < 1 ? 1 : 2;

    const canvas = await toCanvas(clone, {
      backgroundColor: '#ffffff',
      width: rWidth,
      height: rHeight,
      pixelRatio,
      cacheBust: false,
      skipFonts: true,
    });

    const dataUrl = canvas.toDataURL('image/png');

    // Stage 6: create PDF
    console.log('[PDF Export] Creating PDF...');
    const orientation = pageWidth >= pageHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [pageWidth, pageHeight],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`${sanitizePdfFilename(treeName)}.pdf`);

    console.log('[PDF Export] Done');
  } catch (error) {
    console.error(
      '[PDF Export] Failed:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  } finally {
    wrapper.remove();
  }
}
