import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { PEDIGREE_NODE_HEIGHT } from "./pedigreeLayout";

/**
 * A horizontal connector between two spouse cards at the same depth.
 * The line runs from the right edge of the source card
 * to the left edge of the target card, at mid-height.
 */
export function SpouseConnector({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY: _targetY,
  style,
}: EdgeProps) {
  const midY = sourceY + PEDIGREE_NODE_HEIGHT / 2;

  const path = [`M ${sourceX} ${midY}`, `L ${targetX} ${midY}`].join(" ");

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: "#d4a574",
        strokeWidth: 1.5,
        strokeDasharray: "6 3",
        fill: "none",
        strokeLinecap: "round",
        ...style,
      }}
    />
  );
}
