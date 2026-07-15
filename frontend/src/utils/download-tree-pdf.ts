import { type Node } from '@xyflow/react';
import { jsPDF } from 'jspdf';
import { fetchImageDataUrl, createCircularCroppedDataUrl } from './tree-pdf-images';
import { computeRawBounds } from './tree-pdf-bounds';
import { type Bounds, type TypedPersonNode } from './tree-pdf-renderers';
import {
  drawPersonCard,
  drawEdges,
  drawFamilyUnitBoxes,
  drawCoupleHearts,
} from './tree-pdf-composers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed padding on every side, always used before final scaling. */
const FIXED_PADDING = 900;

/**
 * If the total (content + 2×padding) exceeds this dimension, the whole
 * page is uniformly scaled down. Vector quality is preserved.
 *
 * Chrome's PDF viewer can silently crop custom pages that exceed the common
 * 14,400pt PDF page-size limit. Use pt units directly and stay just below
 * that limit so very wide trees are scaled to fit instead of being cut off.
 */
const SAFE_PDF_DIMENSION_PT = 14000;

// ---------------------------------------------------------------------------
// Filename sanitisation
// ---------------------------------------------------------------------------

export function sanitizePdfFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return cleaned || 'family-tree';
}

// ---------------------------------------------------------------------------
// Debug
// ---------------------------------------------------------------------------

function logNodePositions(nodes: Node[]): void {
  const lines = nodes.map(
    (n) =>
      `  ${n.type ?? '?'} id="${n.id.slice(0, 8)}…"  ` +
      `pos=(${n.position.x}, ${n.position.y})`,
  );
  console.log('[PDF Export] All ' + nodes.length + ' node positions:\n' + lines.join('\n'));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function downloadTreeAsPdf(
  nodes: Node[],
  treeName: string,
  options?: { isPublic?: boolean },
): Promise<void> {
  const { isPublic = false } = options ?? {};

  const personNodes = nodes.filter(
    (n): n is TypedPersonNode => n.type === 'personNode',
  );

  if (personNodes.length === 0) {
    throw new Error('No nodes to export');
  }

  // ---- Stage 1: fetch all avatar images in parallel ----
  const imageCache = new Map<string, string | null>();

  const fetchTasks = personNodes.map(async (node) => {
    const { person } = node.data;
    if (!person.profile_image_path) return;

    const rawDataUrl = await fetchImageDataUrl(
      person.tree_id,
      person.id,
      person.profile_image_path,
      isPublic,
    );

    if (!rawDataUrl) {
      imageCache.set(person.id, null);
      return;
    }

    const cropped = await createCircularCroppedDataUrl(rawDataUrl);
    imageCache.set(person.id, cropped);
  });

  await Promise.all(fetchTasks);

  // ---- Stage 2: compute content bounds ----
  logNodePositions(nodes);
  const rawBounds = computeRawBounds(nodes);

  console.log(
    '[PDF Export] Raw bounds: origin=(' +
      rawBounds.x +
      ', ' +
      rawBounds.y +
      ')  size=' +
      rawBounds.width +
      '×' +
      rawBounds.height +
      'px',
  );

  // ---- Stage 3: add generous fixed padding ----
  const contentW = Math.ceil(rawBounds.width + FIXED_PADDING * 2);
  const contentH = Math.ceil(rawBounds.height + FIXED_PADDING * 2);

  // ---- Stage 4: scale down if enormous ----
  const maxDim = Math.max(contentW, contentH);
  let scale = 1;

  if (maxDim > SAFE_PDF_DIMENSION_PT) {
    scale = SAFE_PDF_DIMENSION_PT / maxDim;
  }

  const pageW = Math.ceil(contentW * scale);
  const pageH = Math.ceil(contentH * scale);
  const orientation = pageW >= pageH ? 'landscape' : 'portrait';

  console.log(
    '[PDF Export] PDF page: ' +
      pageW +
      '×' +
      pageH +
      'px  scale=' +
      scale.toFixed(3) +
      '  ' +
      orientation +
      '  (padding=' +
      FIXED_PADDING +
      'px)',
  );

  // ---- Stage 5: create PDF ----
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [pageW, pageH],
  });

  // Draw a light diagnostic border so we can see the page edges.
  {
    const r = 8;
    pdf.setDrawColor('#e0e0e0');
    pdf.setLineWidth(2);
    pdf.roundedRect(r, r, pageW - r * 2, pageH - r * 2, r, r, 'S');
  }

  // ---- Stage 6: draw all content (back-to-front) ----
  const boundsScaled: Bounds = {
    x: rawBounds.x,
    y: rawBounds.y,
    width: pageW,
    height: pageH,
  };

  const padX = FIXED_PADDING;
  const padY = FIXED_PADDING;

  const nodeMap = new Map<string, TypedPersonNode>();
  for (const node of personNodes) {
    nodeMap.set(node.id, node);
  }

  drawFamilyUnitBoxes(pdf, nodes, boundsScaled, padX, padY, scale);
  drawEdges(
    pdf,
    personNodes,
    nodeMap,
    boundsScaled,
    padX,
    padY,
    scale,
  );

  for (const node of personNodes) {
    drawPersonCard(
      pdf,
      node,
      imageCache,
      boundsScaled,
      padX,
      padY,
      scale,
    );
  }

  drawCoupleHearts(pdf, nodes, boundsScaled, padX, padY, scale);

  // ---- Stage 7: save ----
  pdf.save(`${sanitizePdfFilename(treeName)}.pdf`);
}
