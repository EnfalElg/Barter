import {
  RECOMMENDATION_LEVEL_LABEL,
  recommendationLevelBadgeClass,
} from "@/lib/status-labels";
import type { RecommendationLevel } from "@/lib/recommendations";
import { cn } from "@/lib/utils";

export type RecommendationLabelBadgeProps = {
  level: RecommendationLevel;
  label?: string;
  className?: string;
};

export function RecommendationLabelBadge({
  level,
  label,
  className,
}: RecommendationLabelBadgeProps) {
  const text = label ?? RECOMMENDATION_LEVEL_LABEL[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-tight ring-1 ring-inset",
        recommendationLevelBadgeClass(level),
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      {text}
    </span>
  );
}
