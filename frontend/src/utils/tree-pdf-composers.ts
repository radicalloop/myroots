import { jsPDF } from 'jspdf';
import { type Node } from '@xyflow/react';
import {
  PEDIGREE_NODE_WIDTH,
  PEDIGREE_NODE_HEIGHT,
  PEDIGREE_AVATAR_SIZE,
  PEDIGREE_AVATAR_CENTER_Y,
  COUPLE_WIDTH,
  COUPLE_HEART_SIZE,
  FAMILY_UNIT_PADDING,
} from '@/components/TreeView/pedigreeLayout';
import {
  type Bounds,
  type TypedPersonNode,
  RING_THICKNESS,
  TEXT_PRIMARY_COLOR,
  TEXT_MUTED_COLOR,
  drawRoundedCard,
  drawRing,
  drawAvatarImage,
  drawInitialsAvatar,
  drawTextLine,
  drawBirthBadge,
  drawLine,
  drawDashedBox,
  drawHeart,
  offsetCoords,
} from './tree-pdf-renderers';

// ---------------------------------------------------------------------------
// Composite drawing functions
// ---------------------------------------------------------------------------

function s(value: number, scale: number): number {
  return value * scale;
}

export function drawPersonCard(
  pdf: jsPDF,
  node: TypedPersonNode,
  imageCache: Map<string, string | null>,
  bounds: Bounds,
  paddingX: number,
  paddingY: number,
  scale: number,
): void {
  const { person } = node.data;
  const { x, y } = offsetCoords(node, bounds, paddingX, paddingY, scale);

  const cardW = s(PEDIGREE_NODE_WIDTH, scale);
  const cardH = s(PEDIGREE_NODE_HEIGHT, scale);

  drawRoundedCard(pdf, x, y, cardW, cardH, scale);

  const avatarCx = x + cardW / 2;
  const avatarCy = y + s(PEDIGREE_AVATAR_CENTER_Y, scale);
  const avatarR = s(PEDIGREE_AVATAR_SIZE / 2, scale);
  const ringOuterR = avatarR + s(RING_THICKNESS, scale);

  drawRing(pdf, avatarCx, avatarCy, ringOuterR, scale);

  const cachedImg = imageCache.get(person.id);
  if (cachedImg) {
    drawAvatarImage(pdf, cachedImg, avatarCx, avatarCy, avatarR);
  } else {
    const initial = (person.first_name[0] ?? '').toUpperCase();
    drawInitialsAvatar(pdf, avatarCx, avatarCy, avatarR, initial || '?', scale);
  }

  let textY = avatarCy + avatarR + s(RING_THICKNESS + 20, scale);

  drawTextLine(
    pdf,
    person.first_name,
    avatarCx,
    textY,
    s(28, scale),
    TEXT_PRIMARY_COLOR,
    s(PEDIGREE_NODE_WIDTH - 56, scale),
  );

  if (person.last_name && person.last_name !== '-') {
    textY += s(34, scale);
    drawTextLine(
      pdf,
      person.last_name,
      avatarCx,
      textY,
      s(18, scale),
      TEXT_MUTED_COLOR,
      s(PEDIGREE_NODE_WIDTH - 56, scale),
    );
  }

  const birthYear = person.birth_date?.slice(0, 4);
  if (birthYear) {
    drawBirthBadge(pdf, birthYear, avatarCx, y + cardH - s(64, scale), scale);
  }
}

export function drawEdges(
  pdf: jsPDF,
  personNodes: TypedPersonNode[],
  nodeMap: Map<string, TypedPersonNode>,
  bounds: Bounds,
  paddingX: number,
  paddingY: number,
  scale: number,
): void {
  for (const node of personNodes) {
    const { person } = node.data;
    const pos = offsetCoords(node, bounds, paddingX, paddingY, scale);
    const nodeW = s(PEDIGREE_NODE_WIDTH, scale);
    const nodeH = s(PEDIGREE_NODE_HEIGHT, scale);

    const spouseNode = person.spouse
      ? nodeMap.get(person.spouse.id)
      : undefined;
    if (spouseNode) {
      const spousePos = offsetCoords(
        spouseNode,
        bounds,
        paddingX,
        paddingY,
        scale,
      );
      const lineY = pos.y + s(PEDIGREE_AVATAR_CENTER_Y, scale);
      drawLine(pdf, pos.x + nodeW, lineY, spousePos.x, lineY, scale);
    }

    if (person.children.length === 0) continue;

    const hasSpouse = Boolean(person.spouse);
    const sourceX =
      pos.x + s(hasSpouse ? COUPLE_WIDTH : PEDIGREE_NODE_WIDTH, scale) / 2;
    // For couples, edges start below the family-unit box (matches PedigreeEdge)
    const sourceY =
      pos.y + nodeH + (hasSpouse ? s(FAMILY_UNIT_PADDING, scale) : 0);

    for (const child of person.children) {
      const childNode = nodeMap.get(child.id);
      if (!childNode) continue;

      const childPos = offsetCoords(
        childNode,
        bounds,
        paddingX,
        paddingY,
        scale,
      );
      const targetX = childPos.x + nodeW / 2;
      const targetY = childPos.y;

      // Midpoint landing, matching PedigreeEdge busY = sourceY + (targetY - sourceY) / 2
      const landingY = sourceY + (targetY - sourceY) / 2;
      drawLine(pdf, sourceX, sourceY, sourceX, landingY, scale);
      drawLine(pdf, sourceX, landingY, targetX, landingY, scale);
      drawLine(pdf, targetX, landingY, targetX, targetY, scale);
    }
  }
}

export function drawFamilyUnitBoxes(
  pdf: jsPDF,
  nodes: Node[],
  bounds: Bounds,
  paddingX: number,
  paddingY: number,
  scale: number,
): void {
  for (const node of nodes) {
    if (node.type !== 'familyUnit') continue;

    const { x, y } = offsetCoords(node, bounds, paddingX, paddingY, scale);
    drawDashedBox(
      pdf,
      x,
      y,
      s(node.width ?? 0, scale),
      s(node.height ?? 0, scale),
      s(24, scale),
      scale,
    );
  }
}

export function drawCoupleHearts(
  pdf: jsPDF,
  nodes: Node[],
  bounds: Bounds,
  paddingX: number,
  paddingY: number,
  scale: number,
): void {
  for (const node of nodes) {
    if (node.type !== 'coupleHeart') continue;

    const { x, y } = offsetCoords(node, bounds, paddingX, paddingY, scale);
    const cx = x + s(COUPLE_HEART_SIZE / 2, scale);
    const cy = y + s(COUPLE_HEART_SIZE / 2, scale);
    drawHeart(pdf, cx, cy, s(COUPLE_HEART_SIZE, scale));
  }
}
