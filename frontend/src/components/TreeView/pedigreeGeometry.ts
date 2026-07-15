import { type Node } from "@xyflow/react";

export interface GroupBoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  bottomCenterY: number;
}

export interface ParentUnitGeometry {
  centerX: number;
  bottomY: number;
  leftBottomX: number;
  rightBottomX: number;
}

function nodeWidth(node: Node): number {
  return node.measured?.width ?? node.width ?? 0;
}

function nodeHeight(node: Node): number {
  return node.measured?.height ?? node.height ?? 0;
}

function nodeLeft(node: Node): number {
  return node.position.x;
}

function nodeTop(node: Node): number {
  return node.position.y;
}

/**
 * Bounding box for one or more nodes. Falls back to zero-size when dimensions
 * are not yet measured so callers can supply layout defaults.
 */
export function getGroupBoundingBox(
  nodes: Node[],
  fallbackWidth = 0,
  fallbackHeight = 0,
): GroupBoundingBox {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const node of nodes) {
    const width = nodeWidth(node) || fallbackWidth;
    const height = nodeHeight(node) || fallbackHeight;
    const x = nodeLeft(node);
    const y = nodeTop(node);

    left = Math.min(left, x);
    right = Math.max(right, x + width);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + height);
  }

  if (!Number.isFinite(left)) {
    return {
      left: 0,
      right: fallbackWidth,
      top: 0,
      bottom: fallbackHeight,
      centerX: fallbackWidth / 2,
      bottomCenterY: fallbackHeight,
    };
  }

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    bottomCenterY: bottom,
  };
}

/**
 * Connection geometry for a parent unit (single person or spouse group).
 * Child connectors originate from the bottom-center of the group bounding box.
 */
export function getParentUnitGeometry(
  primaryNode: Node,
  partnerNode: Node | null | undefined,
  fallbackWidth: number,
  fallbackHeight: number,
): ParentUnitGeometry {
  const nodes = partnerNode ? [primaryNode, partnerNode] : [primaryNode];
  const bounds = getGroupBoundingBox(nodes, fallbackWidth, fallbackHeight);

  if (!partnerNode) {
    return {
      centerX: bounds.centerX,
      bottomY: bounds.bottomCenterY,
      leftBottomX: bounds.centerX,
      rightBottomX: bounds.centerX,
    };
  }

  const [leftNode, rightNode] =
    nodeLeft(primaryNode) <= nodeLeft(partnerNode)
      ? [primaryNode, partnerNode]
      : [partnerNode, primaryNode];

  const leftWidth = nodeWidth(leftNode) || fallbackWidth;
  const rightWidth = nodeWidth(rightNode) || fallbackWidth;
  const leftBottomX = nodeLeft(leftNode) + leftWidth / 2;
  const rightBottomX = nodeLeft(rightNode) + rightWidth / 2;

  return {
    centerX: bounds.centerX,
    bottomY: bounds.bottomCenterY,
    leftBottomX,
    rightBottomX,
  };
}

export function getNodeCenterX(node: Node, fallbackWidth: number): number {
  const width = nodeWidth(node) || fallbackWidth;
  return nodeLeft(node) + width / 2;
}

export function getNodeTopY(node: Node): number {
  return nodeTop(node);
}

export const FAMILY_UNIT_NODE_PREFIX = "family-unit-";

export function getFamilyUnitNodeId(
  personId: string,
  partnerId: string,
): string {
  const coupleKey = [personId, partnerId].sort().join("::");
  return `${FAMILY_UNIT_NODE_PREFIX}${coupleKey.replace(/::/g, "-")}`;
}

/** Bottom-center anchor for the combined spouse wrapper (family unit node). */
export function getWrapperBottomCenter(
  wrapperNode: Node,
  fallbackWidth: number,
  fallbackHeight: number,
): Pick<ParentUnitGeometry, "centerX" | "bottomY"> {
  const width = nodeWidth(wrapperNode) || fallbackWidth;
  const height = nodeHeight(wrapperNode) || fallbackHeight;
  const left = nodeLeft(wrapperNode);

  return {
    centerX: left + width / 2,
    bottomY: nodeTop(wrapperNode) + height,
  };
}

/** Bottom-center anchor for a single person without a spouse wrapper. */
export function getSinglePersonBottomCenter(
  node: Node,
  fallbackWidth: number,
  fallbackHeight: number,
): Pick<ParentUnitGeometry, "centerX" | "bottomY"> {
  const width = nodeWidth(node) || fallbackWidth;
  const height = nodeHeight(node) || fallbackHeight;
  const left = nodeLeft(node);

  return {
    centerX: left + width / 2,
    bottomY: nodeTop(node) + height,
  };
}
