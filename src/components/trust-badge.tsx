import { getTrustLabel, clampTrustScore } from "@/lib/trust-score";
import { cn } from "@/lib/utils";

const COLOR_CLASS = {
  green: "border-emerald-200/80 bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  yellow: "border-amber-200/80 bg-amber-50/95 text-amber-900 ring-amber-500/15",
  orange: "border-orange-200/80 bg-orange-50/95 text-orange-900 ring-orange-500/15",
  red: "border-red-200/80 bg-red-50/95 text-red-800 ring-red-500/15",
  gray: "border-neutral-200/80 bg-neutral-50/95 text-neutral-600 ring-neutral-400/15",
} as const;

export type TrustBadgeProps = {
  score?: number | null;
  size?: "sm" | "md";
  showScore?: boolean;
  className?: string;
};

export function TrustBadge({
  score,
  size = "md",
  showScore = true,
  className,
}: TrustBadgeProps) {
  const { label, color } = getTrustLabel(score);
  const displayScore =
    score != null && Number.isFinite(score) ? clampTrustScore(score) : null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-bold leading-none ring-1",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        COLOR_CLASS[color],
        className
      )}
    >
      <span className="truncate">{label}</span>
      {showScore && displayScore != null ? (
        <span className="shrink-0 tabular-nums opacity-90">· {displayScore}/100</span>
      ) : null}
    </span>
  );
}
