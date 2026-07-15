import { TreePersonNode } from '@/types/api.types';

export const PEDIGREE_NODE_WIDTH = 300;
export const PEDIGREE_NODE_HEIGHT = 360;
export const PEDIGREE_SIBLING_GAP = 64;
export const PEDIGREE_RANK_GAP = 132;
export const SPOUSE_GAP = 36;
export const FAMILY_UNIT_PADDING = 28;

/** Person card top padding (`pt-8`) + avatar ring padding + half avatar height. */
export const PEDIGREE_CARD_PADDING_TOP = 32;
export const PEDIGREE_AVATAR_RING_PADDING = 8;
export const PEDIGREE_AVATAR_SIZE = 112;
export const PEDIGREE_AVATAR_CENTER_Y =
  PEDIGREE_CARD_PADDING_TOP +
  PEDIGREE_AVATAR_RING_PADDING +
  PEDIGREE_AVATAR_SIZE / 2;

export const COUPLE_HEART_SIZE = 56;
export const COUPLE_HEART_MIDDLE_SIZE = 40;
export const COUPLE_HEART_INNER_SIZE = 28;

/**
 * Effective width of a couple unit (two person cards + gap).
 * Used when a node has a spouse.
 */
export const COUPLE_WIDTH = 2 * PEDIGREE_NODE_WIDTH + SPOUSE_GAP;

export interface PedigreePosition {
  x: number;
  y: number;
}

function layoutSubtree(
  node: TreePersonNode,
  depth: number,
  startX: number,
  positions: Map<string, PedigreePosition>,
): number {
  const y = depth * (PEDIGREE_NODE_HEIGHT + PEDIGREE_RANK_GAP);

  // Effective width this *unit* occupies: couple width if spouse present, else single node width.
  const unitWidth = node.spouse ? COUPLE_WIDTH : PEDIGREE_NODE_WIDTH;

  // The family unit dashed box extends beyond the cards by FAMILY_UNIT_PADDING
  // on each side. Account for this in spacing so boxes don't overlap.
  const extraWidth = node.spouse ? 2 * FAMILY_UNIT_PADDING : 0;

  if (node.children.length === 0) {
    // Position the person card at the left of the unit.
    positions.set(node.id, { x: startX, y });
    if (node.spouse) {
      positions.set(node.spouse.id, {
        x: startX + PEDIGREE_NODE_WIDTH + SPOUSE_GAP,
        y,
      });
    }
    return unitWidth + extraWidth + PEDIGREE_SIBLING_GAP;
  }

  // Layout children subtrees sequentially.
  let cursorX = startX;
  let totalWidth = 0;

  for (const child of node.children) {
    const childWidth = layoutSubtree(child, depth + 1, cursorX, positions);
    cursorX += childWidth;
    totalWidth += childWidth;
  }

  const subtreeWidth = Math.max(unitWidth + extraWidth + PEDIGREE_SIBLING_GAP, totalWidth);

  // Center the couple under their children.
  const coupleCenterX = startX + subtreeWidth / 2;
  const personX = coupleCenterX - unitWidth / 2;

  positions.set(node.id, { x: personX, y });
  if (node.spouse) {
    positions.set(node.spouse.id, {
      x: personX + PEDIGREE_NODE_WIDTH + SPOUSE_GAP,
      y,
    });
  }

  return subtreeWidth;
}

export function computePedigreeLayout(
  root: TreePersonNode,
): Map<string, PedigreePosition> {
  const positions = new Map<string, PedigreePosition>();
  layoutSubtree(root, 0, 0, positions);
  return positions;
}
