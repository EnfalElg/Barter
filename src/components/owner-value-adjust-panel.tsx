"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { AiUncertaintyHelp } from "@/components/ai-uncertainty-help";
import { PrivateValueNote } from "@/components/private-value-note";
import { ProductValueSlider } from "@/components/product-value-slider";
import { BARTER_AI_CHECK_NOTE, BARTER_VALUE_HIDDEN_OWNER } from "@/lib/barter-copy";
import { Button } from "@/components/ui/button";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { aiStatusExplanation } from "@/lib/product-value";
import { evaluateAIBadge, ownerValuePatchFields } from "@/lib/value-badge";
import { isValidOwnerValue } from "@/lib/value-slider";
import type { ValueCheckResult } from "@/lib/types/product";
import { cn } from "@/lib/utils";

export type OwnerValueAdjustPanelProps = {
  productId: string;
  initialUserValue: number;
  aiMinValue: number | null;
  aiMaxValue: number | null;
  aiConfidence: number | null;
  aiValueStatus: ValueCheckResult["ai_value_status"];
  aiUncertaintyReason?: string | null;
  reasoningSummary?: string;
  /** For AI recheck */
  recheckPayload: {
    title: string;
    description: string;
    category: string;
    condition: string;
    location: string;
    image_url?: string;
  };
  onSaved?: (userValue: number) => void;
  className?: string;
};

export function OwnerValueAdjustPanel({
  productId,
  initialUserValue,
  aiMinValue,
  aiMaxValue,
  aiConfidence,
  aiValueStatus,
  aiUncertaintyReason = null,
  reasoningSummary,
  recheckPayload,
  onSaved,
  className,
}: OwnerValueAdjustPanelProps) {
  const [userValue, setUserValue] = useState(initialUserValue);
  const [aiMin, setAiMin] = useState(aiMinValue);
  const [aiMax, setAiMax] = useState(aiMaxValue);
  const [aiConf, setAiConf] = useState(aiConfidence);
  const [status, setStatus] = useState(aiValueStatus);
  const [uncertaintyReason, setUncertaintyReason] = useState(aiUncertaintyReason);
  const [busy, setBusy] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [valueValid, setValueValid] = useState(true);

  const badgeEval = evaluateAIBadge({
    userValue,
    aiMinValue: aiMin,
    aiMaxValue: aiMax,
    aiConfidence: aiConf,
  });
  const badge = fallbackBadgeLabel(badgeEval.ai_badge_label, badgeEval.ai_badge_color);

  const saveValue = useCallback(async () => {
    if (!isValidOwnerValue(userValue)) {
      setError("Lütfen geçerli bir değer gir.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const patch = ownerValuePatchFields(userValue, aiMin, aiMax, aiConf);
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Kayıt başarısız");
      }
      setSuccess("Değer güncellendi.");
      onSaved?.(userValue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }, [productId, userValue, aiMin, aiMax, aiConf, onSaved]);

  const recheckAi = useCallback(async () => {
    setRecheckBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const vcRes = await fetch("/api/ai/value-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recheckPayload,
          user_value: userValue,
        }),
      });
      const vc = (await vcRes.json()) as ValueCheckResult & { error?: string };
      if (!vcRes.ok) {
        throw new Error(vc.error ?? "AI değerlendirmesi başarısız");
      }

      setAiMin(vc.ai_min_value);
      setAiMax(vc.ai_max_value);
      setAiConf(vc.ai_confidence);
      setStatus(vc.ai_value_status);
      setUncertaintyReason(vc.ai_uncertainty_reason);

      const patch = {
        ai_min_value: vc.ai_min_value,
        ai_max_value: vc.ai_max_value,
        ai_confidence: vc.ai_confidence,
        ...ownerValuePatchFields(userValue, vc.ai_min_value, vc.ai_max_value, vc.ai_confidence),
      };

      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "AI sonuçları kaydedilemedi");
      }
      setSuccess("AI değerlendirmesi güncellendi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI değerlendirmesi başarısız");
    } finally {
      setRecheckBusy(false);
    }
  }, [productId, recheckPayload, userValue]);

  const rangeText =
    aiMin != null &&
    aiMax != null &&
    Number.isFinite(aiMin) &&
    Number.isFinite(aiMax)
      ? `${Math.round(aiMin).toLocaleString("tr-TR")} – ${Math.round(aiMax).toLocaleString("tr-TR")}`
      : "—";

  return (
    <div className={cn("space-y-5", className)}>
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Bu ürüne biçtiğin değer:{" "}
          <span className="font-bold text-neutral-900">
            {Math.round(initialUserValue).toLocaleString("tr-TR")} TL
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          AI tahmini aralık: <span className="font-semibold">{rangeText} TL</span>
        </p>
        <div className="mt-3 flex justify-center">
          <ValueBadge label={badge.label} color={badge.color} size="md" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {status === "unknown" ? null : aiStatusExplanation(status)}
        </p>
        {badgeEval.ai_value_status === "unknown" ? (
          <AiUncertaintyHelp
            reason={uncertaintyReason ?? badgeEval.ai_uncertainty_reason}
            className="mt-3 text-left"
          />
        ) : null}
        {reasoningSummary ? (
          <p className="mt-1 text-xs text-neutral-500">{reasoningSummary}</p>
        ) : null}
        <p className="mt-2 text-xs text-neutral-500">{BARTER_AI_CHECK_NOTE}</p>
        <PrivateValueNote variant="compact" className="mt-2 justify-center" />
        <p className="mt-1 text-[11px] font-semibold text-neutral-500">
          {BARTER_VALUE_HIDDEN_OWNER}
        </p>
      </div>

      <ProductValueSlider
        value={userValue}
        onChange={setUserValue}
        aiMinValue={aiMin}
        aiMaxValue={aiMax}
        aiConfidence={aiConf}
        disabled={busy || recheckBusy}
        onValidityChange={setValueValid}
      />

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {success}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button
          type="button"
          disabled={busy || recheckBusy || !valueValid}
          onClick={() => void saveValue()}
          className="rounded-full border-0 bg-[#ff4f01] font-black text-white hover:bg-[#e64700]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Kaydediliyor...
            </>
          ) : (
            "Bu değerle devam et"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || recheckBusy}
          onClick={() => void recheckAi()}
          className="rounded-full border-2 font-bold"
        >
          {recheckBusy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              AI değerlendiriliyor...
            </>
          ) : (
            "AI ile tekrar değerlendir"
          )}
        </Button>
      </div>
    </div>
  );
}
