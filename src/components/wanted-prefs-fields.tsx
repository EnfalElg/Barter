"use client";

import { WantedCategorySelector } from "@/components/wanted-category-selector";
import { WantedKeywordInput } from "@/components/wanted-keyword-input";
import { Label } from "@/components/ui/label";
import type { WantedPrefs } from "@/lib/wanted";
import { cn } from "@/lib/utils";

export type WantedPrefsFieldsProps = {
  value: WantedPrefs;
  onChange: (next: WantedPrefs) => void;
  disabled?: boolean;
  className?: string;
};

export function WantedPrefsFields({ value, onChange, disabled, className }: WantedPrefsFieldsProps) {
  return (
    <section className={cn("space-y-4 rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4", className)}>
      <div>
        <h3 className="text-sm font-black text-neutral-900">Karşılığında ne arıyorsun?</h3>
        <p className="mt-1 text-xs text-neutral-600">
          Bu seçimler sana daha uygun takas önerileri sunmamıza yardımcı olur.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-neutral-700">İlgilendiğin kategoriler</Label>
        <WantedCategorySelector
          value={value.wanted_categories}
          onChange={(wanted_categories) => onChange({ ...value, wanted_categories })}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-neutral-700">Özel olarak aradığın şeyler</Label>
        <p className="text-[11px] text-neutral-500">
          Örneğin: kahve makinesi, Kindle, mekanik klavye
        </p>
        <WantedKeywordInput
          value={value.wanted_keywords}
          onChange={(wanted_keywords) => onChange({ ...value, wanted_keywords })}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
