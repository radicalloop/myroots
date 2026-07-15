import { Heart, Sparkles } from "lucide-react";

export function PersonCardHeartDivider() {
  return (
    <div className="mt-5 flex w-full items-center gap-3 px-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-200/80 to-pink-200/40" />
      <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" aria-hidden="true" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-pink-200/80 to-pink-200/40" />
    </div>
  );
}

export function PersonCardFemaleDecorations() {
  return (
    <>
      <Sparkles
        className="pointer-events-none absolute right-5 top-6 h-5 w-5 text-pink-200/70"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-pink-400/55"
        aria-hidden="true"
      />
    </>
  );
}
