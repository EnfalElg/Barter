import type { AIBadgeColor } from "@/lib/types/product";
import { cn } from "@/lib/utils";

const colorClass: Record<AIBadgeColor, string> = {
  green: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
  yellow: "bg-amber-50 text-amber-950 ring-amber-200/80",
  orange: "bg-orange-50 text-orange-950 ring-orange-200/80",
  red: "bg-rose-50 text-rose-900 ring-rose-200/80",
  dark_red: "bg-red-950/90 text-red-50 ring-red-900/40",
  gray: "bg-neutral-100 text-neutral-700 ring-neutral-200/90",
};

const dot: Record<AIBadgeColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-rose-500",
  dark_red: "bg-red-900",
  gray: "bg-neutral-400",
};

/** Pill + dot için Tailwind sınıfları (Keşfet / özel UI). */
export function getBadgeClasses(color: AIBadgeColor): {
  pill: string;
  dot: string;
} {
  return { pill: colorClass[color] ?? colorClass.gray, dot: dot[color] ?? dot.gray };
}

export type ValueBadgeProps = {
  label: string;
  color: AIBadgeColor;
  className?: string;
  size?: "sm" | "md";
};

export function ValueBadge({ label, color, className, size = "sm" }: ValueBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]",
        colorClass[color] ?? colorClass.gray,
        className
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", dot[color] ?? dot.gray)}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function fallbackBadgeLabel(
  label: string | null | undefined,
  color: AIBadgeColor | null | undefined
): { label: string; color: AIBadgeColor } {
  return {
    label: label?.trim() || "AI emin değil",
    color: color ?? "gray",
  };
}
