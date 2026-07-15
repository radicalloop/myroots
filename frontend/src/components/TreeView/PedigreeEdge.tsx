import { BaseEdge, useReactFlow, type EdgeProps } from "@xyflow/react";
import {
  COUPLE_WIDTH,
  FAMILY_UNIT_PADDING,
  PEDIGREE_NODE_HEIGHT,
  PEDIGREE_NODE_WIDTH,
} from "./pedigreeLayout";
import { PersonNodeData } from "./layoutTree";
import {
  getFamilyUnitNodeId,
  getSinglePersonBottomCenter,
  getWrapperBottomCenter,
} from "./pedigreeGeometry";
import { FAMILY_UNIT_HEIGHT, FAMILY_UNIT_WIDTH } from "./FamilyUnitNode";

export function PedigreeEdge({
  id,
  source,
  target,
  style,
  markerEnd,
}: EdgeProps) {
  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  if (!sourceNode || !targetNode) return null;

  const sourceData = sourceNode.data as PersonNodeData | undefined;
  const sourceSpouse = sourceData?.person?.spouse;

  let sourceX: number;
  let sourceY: number;

  if (sourceSpouse) {
    const wrapperNode = getNode(getFamilyUnitNodeId(source, sourceSpouse.id));

    if (wrapperNode) {
      const anchor = getWrapperBottomCenter(
        wrapperNode,
        FAMILY_UNIT_WIDTH,
        FAMILY_UNIT_HEIGHT,
      );
      sourceX = anchor.centerX;
      sourceY = anchor.bottomY;
    } else {
      sourceX = sourceNode.position.x + COUPLE_WIDTH / 2;
      sourceY =
        sourceNode.position.y +
        (sourceNode.height ?? PEDIGREE_NODE_HEIGHT) +
        FAMILY_UNIT_PADDING;
    }
  } else {
    const anchor = getSinglePersonBottomCenter(
      sourceNode,
      PEDIGREE_NODE_WIDTH,
      PEDIGREE_NODE_HEIGHT,
    );
    sourceX = anchor.centerX;
    sourceY = anchor.bottomY;
  }

  const targetWidth = targetNode.width ?? PEDIGREE_NODE_WIDTH;
  const targetX = targetNode.position.x + targetWidth / 2;
  const targetY = targetNode.position.y;
  const busY = sourceY + (targetY - sourceY) / 2;

  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${busY}`,
    `L ${targetX} ${busY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: "#a8b39a",
        strokeWidth: 1.5,
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
}
