import { Node, Edge } from "@xyflow/react";
import { TreePersonNode } from "@/types/api.types";
import { formatYearRange } from "@/utils/person.utils";
import { formatPersonName } from "@/utils/tree.utils";
import {
  computePedigreeLayout,
  PEDIGREE_NODE_HEIGHT,
  PEDIGREE_NODE_WIDTH,
  COUPLE_WIDTH,
  FAMILY_UNIT_PADDING,
  SPOUSE_GAP,
  PEDIGREE_AVATAR_CENTER_Y,
  COUPLE_HEART_SIZE,
} from "./pedigreeLayout";

export interface PersonNodeData {
  person: TreePersonNode;
  label: string;
  years: string;
  highlighted?: boolean;
  assistantHighlighted?: boolean;
  [key: string]: unknown;
}

/**
 * Flattens the tree into an array, also collecting spouse nodes.
 * Each person appears exactly once (tracked by id).
 */
function flattenTree(
  node: TreePersonNode,
  result: TreePersonNode[],
  visited: Set<string>,
): void {
  if (visited.has(node.id)) return;
  visited.add(node.id);
  result.push(node);

  // Include spouse as a separate node (spouse's children are already
  // merged under the canonical parent, so we only need the spouse person).
  if (node.spouse) {
    if (!visited.has(node.spouse.id)) {
      visited.add(node.spouse.id);
      result.push(node.spouse);
    }
  }

  for (const child of node.children) {
    flattenTree(child, result, visited);
  }
}

/**
 * Returns edges for parent-child and spouse connections.
 *
 * Parent-child edges route from the midpoint of the couple unit
 * (or the center of a single person card when no spouse).
 * Spouse connector edges are horizontal lines between the two cards.
 */
function buildEdges(root: TreePersonNode): Edge[] {
  const edges: Edge[] = [];

  function walk(node: TreePersonNode, visited: Set<string>) {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    for (const child of node.children) {
      // Route child edge from midpoint of couple (or single node center).
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: "pedigree",
      });
      walk(child, visited);
    }
  }

  walk(root, new Set());
  return edges;
}

function buildFamilyUnitNodes(
  persons: TreePersonNode[],
  positions: Map<string, { x: number; y: number }>,
): Node<PersonNodeData>[] {
  const groups: Node<PersonNodeData>[] = [];
  const unitWidth = COUPLE_WIDTH + FAMILY_UNIT_PADDING * 2;
  const unitHeight = PEDIGREE_NODE_HEIGHT + FAMILY_UNIT_PADDING * 2;

  const coveredCoupleIds = new Set<string>();

  for (const person of persons) {
    if (!person.spouse) continue;

    // Deduplicate: if this couple was already boxed from the spouse side, skip.
    const coupleKey = [person.id, person.spouse.id].sort().join("::");
    if (coveredCoupleIds.has(coupleKey)) continue;
    coveredCoupleIds.add(coupleKey);

    const position = positions.get(person.id);
    if (!position) continue;

    groups.push({
      id: `family-unit-${coupleKey.replace(/::/g, "-")}`,
      type: "familyUnit",
      data: {} as PersonNodeData,
      position: {
        x: position.x - FAMILY_UNIT_PADDING,
        y: position.y - FAMILY_UNIT_PADDING,
      },
      width: unitWidth,
      height: unitHeight,
      style: { zIndex: -1 },
      selectable: false,
      draggable: false,
    });
  }

  return groups;
}

function buildCoupleHeartNodes(
  persons: TreePersonNode[],
  positions: Map<string, { x: number; y: number }>,
): Node[] {
  const hearts: Node[] = [];
  const coveredCoupleIds = new Set<string>();

  for (const person of persons) {
    if (!person.spouse) continue;

    const coupleKey = [person.id, person.spouse.id].sort().join("::");
    if (coveredCoupleIds.has(coupleKey)) continue;
    coveredCoupleIds.add(coupleKey);

    const position = positions.get(person.id);
    if (!position) continue;

    hearts.push({
      id: `couple-heart-${coupleKey.replace(/::/g, "-")}`,
      type: "coupleHeart",
      data: {},
      position: {
        x:
          position.x +
          PEDIGREE_NODE_WIDTH +
          SPOUSE_GAP / 2 -
          COUPLE_HEART_SIZE / 2,
        y: position.y + PEDIGREE_AVATAR_CENTER_Y - COUPLE_HEART_SIZE / 2,
      },
      width: COUPLE_HEART_SIZE,
      height: COUPLE_HEART_SIZE,
      style: { zIndex: 10 },
      selectable: false,
      draggable: false,
    });
  }

  return hearts;
}

export function treeToFlowElements(root: TreePersonNode | null): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!root) return { nodes: [], edges: [] };

  const persons: TreePersonNode[] = [];
  flattenTree(root, persons, new Set());

  const positions = computePedigreeLayout(root);

  const familyUnitNodes = buildFamilyUnitNodes(persons, positions);
  const coupleHeartNodes = buildCoupleHeartNodes(persons, positions);

  const nodes: Node<PersonNodeData>[] = persons.map((person) => {
    const position = positions.get(person.id) ?? { x: 0, y: 0 };

    return {
      id: person.id,
      type: "personNode",
      data: {
        person,
        label: formatPersonName(person),
        years: formatYearRange(person.birth_date, person.death_date),
      },
      position,
      width: PEDIGREE_NODE_WIDTH,
      height: PEDIGREE_NODE_HEIGHT,
      draggable: false,
    };
  });

  return {
    nodes: [...nodes, ...familyUnitNodes, ...coupleHeartNodes],
    edges: buildEdges(root),
  };
}
