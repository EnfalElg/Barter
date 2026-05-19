import { evaluateAIBadge as evaluateAIBadgeCore } from "@/lib/product-value";
import type { AIBadgeEvaluation, EvaluateAIBadgeOptions } from "@/lib/product-value";
import type { AIBadgeColor, AIValueStatus } from "@/lib/types/product";

export type { AIBadgeEvaluation };

export type EvaluateAIBadgeInput = {
  userValue: number;
  aiMinValue: number | null | undefined;
  aiMaxValue: number | null | undefined;
  aiConfidence: number | null | undefined;
};

export type EvaluateAIBadgeResult = {
  ai_value_deviation: number | null;
  ai_value_status: AIValueStatus;
  ai_badge_label: string;
  ai_badge_color: AIBadgeColor;
  ai_uncertainty_reason: string | null;
};

/** Object-style wrapper around shared badge rules (no AI call). */
export function evaluateAIBadge(
  input: EvaluateAIBadgeInput & EvaluateAIBadgeOptions
): EvaluateAIBadgeResult {
  const { userValue, aiMinValue, aiMaxValue, aiConfidence, listingHint, uncertaintyReason } =
    input;
  const r = evaluateAIBadgeCore(userValue, aiMinValue, aiMaxValue, aiConfidence, {
    listingHint,
    uncertaintyReason,
  });
  return {
    ai_value_deviation: r.ai_value_deviation,
    ai_value_status: r.ai_value_status,
    ai_badge_label: r.ai_badge_label,
    ai_badge_color: r.ai_badge_color,
    ai_uncertainty_reason: r.ai_uncertainty_reason,
  };
}

/** DB patch fields derived from slider value + existing AI range. */
export function ownerValuePatchFields(
  userValue: number,
  aiMin: number | null | undefined,
  aiMax: number | null | undefined,
  aiConfidence: number | null | undefined
) {
  const badge = evaluateAIBadge({
    userValue,
    aiMinValue: aiMin,
    aiMaxValue: aiMax,
    aiConfidence,
  });
  return {
    user_value: userValue,
    estimated_price: userValue,
    ai_value_deviation: badge.ai_value_deviation,
    ai_value_status: badge.ai_value_status,
    ai_badge_label: badge.ai_badge_label,
    ai_badge_color: badge.ai_badge_color,
    ai_uncertainty_reason: badge.ai_uncertainty_reason,
  };
}
