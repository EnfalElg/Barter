import type { SafetyColor, SafetyRiskLevel } from "@/lib/barter-safety";
import { cn } from "@/lib/utils";

const COLOR_CLASS: Record<SafetyColor, string> = {
  green: "border-emerald-200/80 bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  yellow: "border-amber-200/80 bg-amber-50/95 text-amber-900 ring-amber-500/15",
  orange: "border-orange-200/80 bg-orange-50/95 text-orange-900 ring-orange-500/15",
  red: "border-red-200/80 bg-red-50/95 text-red-800 ring-red-500/15",
  gray: "border-neutral-200/80 bg-neutral-50/95 text-neutral-600 ring-neutral-400/15",
};

const ICON: Record<SafetyRiskLevel, string> = {
  low: "🛡️",
  medium: "⚠️",
  high: "🚨",
  unknown: "❔",
};

export type SafetyBadgeProps = {
  riskLevel: SafetyRiskLevel;
  label: string;
  color: SafetyColor;
  size?: "sm" | "md";
  className?: string;
};

export function SafetyBadge({
  riskLevel,
  label,
  color,
  size = "md",
  className,
}: SafetyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border font-bold leading-none ring-1",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        COLOR_CLASS[color],
        className
      )}
    >
      <span className="shrink-0 text-[13px] leading-none" aria-hidden>
        {ICON[riskLevel]}
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
