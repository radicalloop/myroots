import { jsPDF } from 'jspdf';
import type { PersonNodeData } from '@/components/TreeView/layoutTree';
import { type Node } from '@xyflow/react';

// ---------------------------------------------------------------------------
// Constants (unscaled base values — callers apply scale at draw time)
// ---------------------------------------------------------------------------

export const CARD_RADIUS = 28;
export const RING_THICKNESS = 8;
export const RING_COLOR = '#dcefd0';
export const CARD_BG_COLOR = '#ffffff';
export const CARD_BORDER_COLOR = '#edf0eb';
export const TEXT_PRIMARY_COLOR = '#1f2923';
export const TEXT_MUTED_COLOR = '#969d90';
export const BADGE_BG_COLOR = '#f1f4f0';
export const BADGE_TEXT_COLOR = '#68806b';
export const INITIALS_BG_COLOR = '#ffffff';
export const INITIALS_TEXT_COLOR = '#047857';
export const HEART_FILL_COLOR = '#ffffff';
export const HEART_CIRCLE_COLOR = '#ec4899';
export const HEART_GLOW_COLOR = '#f9d0e6';
export const FAMILY_UNIT_DASH: number[] = [6, 6];
export const FAMILY_UNIT_COLOR = '#c4ccc0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TypedPersonNode = Node & { data: PersonNodeData };

// ---------------------------------------------------------------------------
// Coordinate offset (applies scale so callers don't need to multiply
// individual dimension calls by hand for the positioning part).
// ---------------------------------------------------------------------------

export function offsetCoords(
  node: Node,
  bounds: Bounds,
  paddingX: number,
  paddingY: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: (node.position.x - bounds.x + paddingX) * scale,
    y: (node.position.y - bounds.y + paddingY) * scale,
  };
}

// ---------------------------------------------------------------------------
// Drawing primitives — all coordinates and sizes are expected to already
// include scale, except where noted with an explicit `scale` param.
// ---------------------------------------------------------------------------

export function drawLine(
  pdf: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number,
): void {
  pdf.setDrawColor(TEXT_MUTED_COLOR);
  pdf.setLineWidth(1.5 * scale);
  pdf.line(x1, y1, x2, y2);
}

export function drawRoundedCard(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
): void {
  pdf.setFillColor(CARD_BG_COLOR);
  pdf.setDrawColor(CARD_BORDER_COLOR);
  pdf.setLineWidth(1 * scale);
  pdf.roundedRect(
    x,
    y,
    w,
    h,
    CARD_RADIUS * scale,
    CARD_RADIUS * scale,
    'FD',
  );
}

export function drawRing(
  pdf: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  scale: number,
): void {
  pdf.setFillColor(RING_COLOR);
  pdf.circle(cx, cy, outerR, 'F');
  pdf.setFillColor(CARD_BG_COLOR);
  pdf.circle(cx, cy, outerR - RING_THICKNESS * scale, 'F');
}

export function drawAvatarImage(
  pdf: jsPDF,
  imageDataUrl: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const size = r * 2;
  pdf.addImage(imageDataUrl, 'PNG', cx - r, cy - r, size, size);
}

export function drawInitialsAvatar(
  pdf: jsPDF,
  cx: number,
  cy: number,
  r: number,
  initial: string,
  scale: number,
): void {
  pdf.setFillColor(INITIALS_BG_COLOR);
  pdf.circle(cx, cy, r, 'F');

  pdf.setFont('times', 'normal');
  pdf.setFontSize(48 * scale);
  pdf.setTextColor(INITIALS_TEXT_COLOR);
  const textMetrics = pdf.getTextDimensions(initial);
  const textY = cy + textMetrics.h / 3;
  pdf.text(initial, cx, textY, { align: 'center' });
}

export function drawTextLine(
  pdf: jsPDF,
  text: string,
  cx: number,
  y: number,
  fontSize: number,
  color: string,
  _maxWidthW?: number,
): void {
  pdf.setFont('times', 'normal');
  pdf.setFontSize(fontSize);
  pdf.setTextColor(color);
  pdf.text(text, cx, y, {
    align: 'center',
    maxWidth: _maxWidthW ?? undefined,
  });
}

export function drawBirthBadge(
  pdf: jsPDF,
  birthYear: string,
  cx: number,
  y: number,
  scale: number,
): void {
  const text = `B. ${birthYear}`;
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16 * scale);
  pdf.setTextColor(BADGE_TEXT_COLOR);

  const textWidth = pdf.getTextWidth(text);
  const badgeW = textWidth + 40 * scale;
  const badgeH = 36 * scale;
  const badgeX = cx - badgeW / 2;

  pdf.setFillColor(BADGE_BG_COLOR);
  pdf.roundedRect(
    badgeX,
    y,
    badgeW,
    badgeH,
    badgeH / 2,
    badgeH / 2,
    'F',
  );

  pdf.text(text, cx, y + badgeH / 2 + 5 * scale, { align: 'center' });
}

export function drawDashedBox(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  scale: number,
): void {
  pdf.setDrawColor(FAMILY_UNIT_COLOR);
  pdf.setLineWidth(1.5 * scale);
  pdf.setLineDashPattern(FAMILY_UNIT_DASH, 0);
  pdf.roundedRect(x, y, w, h, r, r, 'S');
  pdf.setLineDashPattern([], 0);
}

// The exact Lucide `Heart` icon path, authored in a 24x24 viewBox. Rebuilt
// as absolute cubic-Bézier segments so the PDF heart matches the UI icon
// precisely (same rounded lobes and bottom tip). The two SVG elliptical arcs
// are replaced with their standard 90-degree cubic approximations
// (control offset k = 0.5523 * r, r = 5.5 => k ~= 3.04).
//
// Source path (starts at the right shoulder, runs counter-clockwise):
//   M19 14 c1.49-1.46 3-3.21 3-5.5 A5.5 5.5 0 0 0 16.5 3
//   c-1.76 0-3 .5-4.5 2 -1.5-1.5-2.74-2-4.5-2 A5.5 5.5 0 0 0 2 8.5
//   c0 2.3 1.5 4.05 3 5.5 l7 7 Z
const LUCIDE_HEART_VIEWBOX = 24;

// Path start point (right shoulder) in 24x24 space.
const LUCIDE_HEART_START: [number, number] = [19, 14];

// Absolute cubic segments as [c1x, c1y, c2x, c2y, endX, endY].
const LUCIDE_HEART_SEGMENTS: number[][] = [
  // Right shoulder curving in toward the top-right lobe apex.
  [20.49, 12.54, 22, 10.79, 22, 8.5],
  // Arc: top-right lobe over to the top centre (approx of A5.5).
  [22, 5.46, 19.54, 3, 16.5, 3],
  // Down into the centre cleft.
  [14.74, 3, 13.5, 3.5, 12, 5],
  // Up out of the cleft to the top-left lobe start.
  [10.5, 3.5, 9.26, 3, 7.5, 3],
  // Arc: top-left lobe over to the left shoulder (approx of A5.5).
  [4.46, 3, 2, 5.46, 2, 8.5],
  // Left shoulder curving down toward the bottom body.
  [2, 10.8, 3.5, 12.55, 5, 14],
  // Straight run down to the bottom tip (line 7,7 as a degenerate cubic).
  [5, 14, 12, 21, 12, 21],
];

function fillHeartPath(
  pdf: jsPDF,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  pdf.setFillColor(color);
  pdf.setDrawColor(color);

  const unit = size / LUCIDE_HEART_VIEWBOX;
  // The heart's visible bounding box in viewBox space is x:[2,22] (centre 12)
  // and y:[3,21] (centre 12). Centre that box on (cx, cy) so the icon sits
  // exactly in the middle of the badge circle.
  const boxCenterX = 12;
  const boxCenterY = 12;
  const originX = cx - boxCenterX * unit;
  const originY = cy - boxCenterY * unit;

  const toX = (vx: number) => originX + vx * unit;
  const toY = (vy: number) => originY + vy * unit;

  const startX = toX(LUCIDE_HEART_START[0]);
  const startY = toY(LUCIDE_HEART_START[1]);

  // jsPDF.lines expects each Bézier as relative offsets from the previous
  // point: [c1x, c1y, c2x, c2y, ex, ey]. Convert absolute anchors to deltas.
  let prevX = LUCIDE_HEART_START[0];
  let prevY = LUCIDE_HEART_START[1];
  const segments = LUCIDE_HEART_SEGMENTS.map(
    ([c1x, c1y, c2x, c2y, ex, ey]) => {
      const rel = [
        (c1x - prevX) * unit,
        (c1y - prevY) * unit,
        (c2x - prevX) * unit,
        (c2y - prevY) * unit,
        (ex - prevX) * unit,
        (ey - prevY) * unit,
      ];
      prevX = ex;
      prevY = ey;
      return rel;
    },
  );

  pdf.lines(segments, startX, startY, [1, 1], 'F', true);
}

export function drawHeart(
  pdf: jsPDF,
  cx: number,
  cy: number,
  size: number,
): void {
  // Layout mirrors the UI badge: a pink circle (half the badge size) holding
  // a white heart (~half the circle) centred inside, with a soft glow behind.
  const circleR = size / 4;
  const heartSize = circleR * 1.05;

  pdf.setFillColor(HEART_GLOW_COLOR);
  pdf.circle(cx, cy, size * 0.42, 'F');

  pdf.setFillColor(HEART_CIRCLE_COLOR);
  pdf.circle(cx, cy, circleR, 'F');

  fillHeartPath(pdf, cx, cy, heartSize, HEART_FILL_COLOR);
}
