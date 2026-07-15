import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import {
  PEDIGREE_NODE_HEIGHT,
  PEDIGREE_NODE_WIDTH,
  SPOUSE_GAP,
  FAMILY_UNIT_PADDING,
} from "./pedigreeLayout";

export const FAMILY_UNIT_WIDTH =
  2 * PEDIGREE_NODE_WIDTH + SPOUSE_GAP + FAMILY_UNIT_PADDING * 2;

export const FAMILY_UNIT_HEIGHT =
  PEDIGREE_NODE_HEIGHT + FAMILY_UNIT_PADDING * 2;

function FamilyUnitNodeComponent(_props: NodeProps) {
  return (
    <div
      style={{
        width: FAMILY_UNIT_WIDTH,
        height: FAMILY_UNIT_HEIGHT,
      }}
      className="relative pointer-events-none"
    >
      <div className="absolute inset-0 rounded-[36px] border border-[#d5ddd2] bg-[#f7faf5]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_24px_rgba(31,41,35,0.04)]" />
    </div>
  );
}

export const FamilyUnitNode = memo(FamilyUnitNodeComponent);
