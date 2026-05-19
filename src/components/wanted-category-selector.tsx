"use client";

import { WANTED_CATEGORY_OPTIONS } from "@/lib/wanted";
import { cn } from "@/lib/utils";

export type WantedCategorySelectorProps = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function WantedCategorySelector({
  value,
  onChange,
  disabled,
  className,
}: WantedCategorySelectorProps) {
  const toggle = (cat: string) => {
    if (disabled) return;
    if (value.includes(cat)) {
      onChange(value.filter((c) => c !== cat));
    } else {
      onChange([...value, cat]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {WANTED_CATEGORY_OPTIONS.map((cat) => {
        const on = value.includes(cat);
        return (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => toggle(cat)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              on
                ? "border-[#ff4f01] bg-[#fff0e8] text-[#c2410c] shadow-sm"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-[#ff4f01]/40",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
