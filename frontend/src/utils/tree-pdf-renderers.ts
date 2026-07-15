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
export const HEART_COLOR = '#ef4444';
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

export function drawHeart(
  pdf: jsPDF,
  cx: number,
  cy: number,
  size: number,
): void {
  const r = size / 2;
  pdf.setFillColor(HEART_COLOR);
  pdf.setDrawColor(HEART_COLOR);

  const leftCx = cx - r * 0.5;
  const rightCx = cx + r * 0.5;
  const topY = cy - r * 0.35;
  const bottomY = cy + r * 0.55;

  pdf.circle(leftCx, topY, r * 0.55, 'F');
  pdf.circle(rightCx, topY, r * 0.55, 'F');

  pdf.triangle(
    leftCx - r * 0.55,
    topY + r * 0.25,
    rightCx + r * 0.55,
    topY + r * 0.25,
    cx,
    bottomY,
    'F',
  );
}
