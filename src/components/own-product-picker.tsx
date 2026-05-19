"use client";

import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import type { PublicProduct } from "@/lib/types/product";
import { cn } from "@/lib/utils";

import { Camera, Check } from "lucide-react";

export type OwnProductPickerProps = {
  products: PublicProduct[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelected?: number;
  title?: string;
  helperText?: string;
  className?: string;
  compact?: boolean;
};

export function OwnProductPicker({
  products,
  selectedIds,
  onChange,
  maxSelected,
  title,
  helperText,
  className,
  compact = false,
}: OwnProductPickerProps) {
  const selectedSet = new Set(selectedIds);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (maxSelected === 1) {
      onChange([id]);
      return;
    }
    if (maxSelected != null && selectedIds.length >= maxSelected) return;
    onChange([...selectedIds, id]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {title ? (
        <h3 className="text-sm font-black text-neutral-900">{title}</h3>
      ) : null}
      {helperText ? (
        <p className="text-xs leading-relaxed text-neutral-600">{helperText}</p>
      ) : null}

      <p className="text-xs font-semibold text-[#ff4f01]">
        {selectedIds.length} ürün seçildi
      </p>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-4 py-6 text-sm text-neutral-600">
          Yayında ürünün yok.
        </p>
      ) : (
        <ul
          className={cn(
            "grid list-none gap-2 overflow-y-auto p-0",
            compact
              ? "max-h-[240px] grid-cols-2 sm:grid-cols-3"
              : "max-h-[320px] grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          )}
        >
          {products.map((p) => {
            const on = selectedSet.has(p.id);
            const ai = fallbackBadgeLabel(p.ai_badge_label, p.ai_badge_color);
            const atMax =
              maxSelected != null &&
              !on &&
              selectedIds.length >= maxSelected &&
              maxSelected > 1;

            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={atMax}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition ring-1 ring-black/[0.04]",
                    on
                      ? "border-[#ff4f01] bg-[#fff0e8] shadow-md"
                      : "border-transparent bg-white/90 hover:border-[#ff4f01]/30",
                    atMax && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-400">
                        <Camera className="size-8" aria-hidden />
                      </div>
                    )}
                    {on ? (
                      <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-[#ff4f01] px-2 py-0.5 text-[10px] font-black text-white shadow">
                        <Check className="size-3" aria-hidden />
                        Seçili
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="line-clamp-2 text-[11px] font-bold text-neutral-900">
                      {p.title}
                    </p>
                    <p className="text-[10px] text-neutral-500">{p.category}</p>
                    <ValueBadge label={ai.label} color={ai.color} size="sm" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
