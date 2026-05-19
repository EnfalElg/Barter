import type { LocationProximityBadge } from "@/lib/geo";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<LocationProximityBadge["tone"], string> = {
  green:
    "border-emerald-200/80 bg-emerald-50/95 text-emerald-800 ring-emerald-500/15",
  amber: "border-amber-200/80 bg-amber-50/95 text-amber-900 ring-amber-500/15",
  gray: "border-neutral-200/80 bg-neutral-50/95 text-neutral-700 ring-neutral-400/15",
  violet: "border-violet-200/80 bg-violet-50/95 text-violet-800 ring-violet-400/20",
};

export type LocationProximityBadgeProps = {
  badge: LocationProximityBadge;
  /** Overlay on product photos */
  variant?: "overlay" | "inline";
  className?: string;
};

export function LocationProximityBadgeChip({
  badge,
  variant = "overlay",
  className,
}: LocationProximityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border py-1 pl-1.5 pr-2.5 text-[11px] font-bold leading-none shadow-sm ring-1",
        TONE_CLASS[badge.tone],
        variant === "overlay" && "backdrop-blur-md",
        className
      )}
    >
      <span className="shrink-0 text-[13px] leading-none" aria-hidden>
        {badge.icon}
      </span>
      <span className="truncate">{badge.label}</span>
    </span>
  );
}
