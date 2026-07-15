import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { CoupleHeartBadge } from "./CoupleHeartBadge";
import { COUPLE_HEART_SIZE } from "./pedigreeLayout";

function CoupleHeartNodeComponent(_props: NodeProps) {
  return (
    <div
      className="pointer-events-none"
      style={{ width: COUPLE_HEART_SIZE, height: COUPLE_HEART_SIZE }}
    >
      <CoupleHeartBadge />
    </div>
  );
}

export const CoupleHeartNode = memo(CoupleHeartNodeComponent);
