"use client";

import { useEffect, useMemo, useState } from "react";

import { ValueBadge } from "@/components/value-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluateAIBadge } from "@/lib/value-badge";
import {
  clampSliderValue,
  computeValueSliderBounds,
  isValidOwnerValue,
} from "@/lib/value-slider";
import { cn } from "@/lib/utils";

export type ProductValueSliderProps = {
  value: number;
  onChange: (value: number) => void;
  aiMinValue: number | null;
  aiMaxValue: number | null;
  aiConfidence: number | null;
  disabled?: boolean;
  className?: string;
  /** Show owner-only manual number input (default true). */
  allowManualEntry?: boolean;
  onValidityChange?: (valid: boolean) => void;
};

export function ProductValueSlider({
  value,
  onChange,
  aiMinValue,
  aiMaxValue,
  aiConfidence,
  disabled = false,
  className,
  allowManualEntry = true,
  onValidityChange,
}: ProductValueSliderProps) {
  const { min, max, step } = useMemo(
    () => computeValueSliderBounds(value, aiMinValue, aiMaxValue),
    [value, aiMinValue, aiMaxValue]
  );

  const [manualText, setManualText] = useState(String(Math.round(value)));

  useEffect(() => {
    setManualText(String(Math.round(value)));
  }, [value]);

  const valid = isValidOwnerValue(value);

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const badge = useMemo(
    () =>
      evaluateAIBadge({
        userValue: value,
        aiMinValue,
        aiMaxValue,
        aiConfidence,
      }),
    [value, aiMinValue, aiMaxValue, aiConfidence]
  );

  const hasRange =
    aiMinValue != null &&
    aiMaxValue != null &&
    Number.isFinite(aiMinValue) &&
    Number.isFinite(aiMaxValue) &&
    aiMinValue > 0 &&
    aiMaxValue >= aiMinValue;

  const rangeText = hasRange
    ? `${Math.round(aiMinValue!).toLocaleString("tr-TR")} – ${Math.round(aiMaxValue!).toLocaleString("tr-TR")} TL`
    : null;

  const aiMid = hasRange ? (aiMinValue! + aiMaxValue!) / 2 : null;

  const sliderDisplay = clampSliderValue(value, min, max);

  const onSliderChange = (v: number) => onChange(clampSliderValue(v, min, max));

  const onManualInputChange = (raw: string) => {
    setManualText(raw);
    const n = Number(raw.replace(/\s/g, "").replace(",", "."));
    if (raw.trim() === "") return;
    if (Number.isFinite(n) && n > 0) {
      onChange(Math.round(n));
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          Değeri güncelle
        </p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Bu değer diğer kullanıcılara gösterilmez. Sadece denk takasları bulmak için kullanılır.
        </p>

        <p className="mt-4 text-center text-lg font-black text-neutral-900">
          Seçili değer:{" "}
          <span className="text-[#ff4f01]">
            {Math.round(value).toLocaleString("tr-TR")} TL
          </span>
        </p>

        {rangeText ? (
          <p className="mt-1 text-center text-xs text-neutral-600">
            AI tahmini aralık: <span className="font-semibold">{rangeText}</span>
          </p>
        ) : null}

        {allowManualEntry ? (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="owner-value-manual" className="text-xs font-bold text-neutral-700">
              Değeri elle gir
            </Label>
            <Input
              id="owner-value-manual"
              type="number"
              inputMode="numeric"
              min={0}
              step={step}
              value={manualText}
              disabled={disabled}
              onChange={(e) => onManualInputChange(e.target.value)}
              className="h-12 rounded-2xl border-neutral-200/90 bg-white text-center text-base font-bold shadow-inner"
            />
            {!valid ? (
              <p className="text-center text-xs font-medium text-red-700">
                Lütfen geçerli bir değer gir.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 px-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={sliderDisplay}
            disabled={disabled}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#ff4f01] disabled:opacity-50 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff4f01] [&::-webkit-slider-thumb]:shadow-md"
            aria-label="Ürün değeri kaydırıcı"
          />
          <div className="mt-1 flex justify-between text-[10px] font-medium text-neutral-400">
            <span>{Math.round(min).toLocaleString("tr-TR")}</span>
            <span>{Math.round(max).toLocaleString("tr-TR")}</span>
          </div>
        </div>

        {hasRange ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(Math.round(aiMinValue!))}
              className="rounded-full border-[#ff4f01]/30 text-xs font-bold"
            >
              AI alt sınırına çek
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || aiMid == null}
              onClick={() => aiMid != null && onChange(Math.round(aiMid))}
              className="rounded-full border-[#ff4f01]/30 text-xs font-bold"
            >
              AI ortalamasına çek
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(Math.round(aiMaxValue!))}
              className="rounded-full border-[#ff4f01]/30 text-xs font-bold"
            >
              AI üst sınırına çek
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-neutral-600">AI değerlendirmesi önizleme</span>
          <ValueBadge label={badge.ai_badge_label} color={badge.ai_badge_color} size="md" />
        </div>
      </div>
    </div>
  );
}
