import { type Node } from '@xyflow/react';
import {
  PEDIGREE_NODE_WIDTH,
  PEDIGREE_NODE_HEIGHT,
  COUPLE_HEART_SIZE,
  FAMILY_UNIT_PADDING,
  SPOUSE_GAP,
} from '@/components/TreeView/pedigreeLayout';
import { type Bounds } from './tree-pdf-renderers';

/** Extra space (px) reserved below the bottom row for edge routing. */
const EDGE_BOTTOM_MARGIN = 80;

/** Actual rendered width of a family-unit dashed box. */
const FAMILY_UNIT_WIDTH =
  2 * PEDIGREE_NODE_WIDTH + SPOUSE_GAP + 2 * FAMILY_UNIT_PADDING;

/** Actual rendered height of a family-unit dashed box. */
const FAMILY_UNIT_HEIGHT = PEDIGREE_NODE_HEIGHT + 2 * FAMILY_UNIT_PADDING;

function nodeWidth(node: Node): number {
  switch (node.type) {
    case 'personNode':
      return PEDIGREE_NODE_WIDTH;
    case 'familyUnit':
      return FAMILY_UNIT_WIDTH;
    case 'coupleHeart':
      return COUPLE_HEART_SIZE;
    default:
      return node.width ?? node.measured?.width ?? 0;
  }
}

function nodeHeight(node: Node): number {
  switch (node.type) {
    case 'personNode':
      return PEDIGREE_NODE_HEIGHT;
    case 'familyUnit':
      return FAMILY_UNIT_HEIGHT;
    case 'coupleHeart':
      return COUPLE_HEART_SIZE;
    default:
      return node.height ?? node.measured?.height ?? 0;
  }
}

/**
 * Computes the bounding box of all nodes using layout constants,
 * NOT xyflow's getNodesBounds (which may use measured DOM sizes).
 */
export function computeRawBounds(nodes: Node[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const w = nodeWidth(node);
    const h = nodeHeight(node);

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY + EDGE_BOTTOM_MARGIN,
  };
}
