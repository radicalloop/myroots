import { Heart } from "lucide-react";
import { COUPLE_HEART_INNER_SIZE, COUPLE_HEART_SIZE } from "./pedigreeLayout";

export function CoupleHeartBadge() {
  return (
    <div
      className="pointer-events-none relative flex items-center justify-center top-1/2 translate-y-1/2"
      style={{ width: COUPLE_HEART_SIZE, height: COUPLE_HEART_SIZE }}
      aria-hidden="true"
    >
      <div
        className="absolute rounded-full"
        style={{
          width: COUPLE_HEART_SIZE,
          height: COUPLE_HEART_SIZE,
          background:
            "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)",
          boxShadow: "0 0 24px 8px rgba(236, 72, 153, 0.25)",
        }}
      />

      <div
        className="absolute flex items-center justify-center rounded-full bg-gradient-to-br from-[#f472b6] to-[#ec4899]"
        style={{
          width: COUPLE_HEART_INNER_SIZE,
          height: COUPLE_HEART_INNER_SIZE,
        }}
      >
        <Heart className="h-3.5 w-3.5 fill-white text-white" />
      </div>
    </div>
  );
}
