import { NextResponse } from "next/server";

import {
  UNCERTAINTY_REASONS,
  inferListingDetailReason,
  isAiParseError,
} from "@/lib/ai-uncertainty";
import { estimateValueRange } from "@/lib/ai-value-range";
import { evaluateAIBadge } from "@/lib/product-value";
import type { ValueCheckResult } from "@/lib/types/product";

export const runtime = "nodejs";

type Body = {
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  user_value?: number;
  image_url?: string;
  location?: string;
};

function unknownFallback(
  partial: Partial<ValueCheckResult> & Pick<ValueCheckResult, "ai_uncertainty_reason">
): ValueCheckResult {
  return {
    ai_min_value: null,
    ai_max_value: null,
    ai_confidence: 0,
    ai_value_deviation: null,
    ai_value_status: "unknown",
    ai_badge_label: "AI emin değil",
    ai_badge_color: "gray",
    reasoning_summary: "",
    ...partial,
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const condition = typeof body.condition === "string" ? body.condition.trim() : "";
  const user_value = body.user_value;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  if (!condition) {
    return NextResponse.json({ error: "condition is required" }, { status: 400 });
  }
  if (typeof user_value !== "number" || !Number.isFinite(user_value) || user_value <= 0) {
    return NextResponse.json(
      { error: "user_value must be a positive number" },
      { status: 400 }
    );
  }

  const image_url =
    typeof body.image_url === "string" && body.image_url.trim()
      ? body.image_url.trim()
      : undefined;
  const location =
    typeof body.location === "string" && body.location.trim()
      ? body.location.trim()
      : undefined;

  const listingInput = {
    title,
    description,
    category,
    condition,
    image_url,
  };
  const listingHint = inferListingDetailReason(listingInput);

  try {
    const parsed = await estimateValueRange({
      title,
      description,
      category,
      condition,
      user_value,
      image_url,
      location,
    });

    const missingRange =
      parsed.ai_min_value == null ||
      parsed.ai_max_value == null ||
      !Number.isFinite(parsed.ai_min_value) ||
      !Number.isFinite(parsed.ai_max_value);

    let uncertaintyOverride: string | null = null;
    if (missingRange) {
      uncertaintyOverride = listingHint ?? UNCERTAINTY_REASONS.missing_range;
    } else if (parsed.ai_confidence < 0.45) {
      uncertaintyOverride = UNCERTAINTY_REASONS.low_confidence;
    }

    const badge = evaluateAIBadge(
      user_value,
      parsed.ai_min_value,
      parsed.ai_max_value,
      parsed.ai_confidence,
      {
        listingHint,
        uncertaintyReason: uncertaintyOverride,
      }
    );

    const payload: ValueCheckResult = {
      ai_min_value: parsed.ai_min_value,
      ai_max_value: parsed.ai_max_value,
      ai_confidence: parsed.ai_confidence,
      ai_value_deviation: badge.ai_value_deviation,
      ai_value_status: badge.ai_value_status,
      ai_badge_label: badge.ai_badge_label,
      ai_badge_color: badge.ai_badge_color,
      ai_uncertainty_reason: badge.ai_uncertainty_reason,
      reasoning_summary: parsed.reasoning_summary,
    };

    return NextResponse.json(payload);
  } catch (e: unknown) {
    console.error("[value-check]", e);
    const parseFailed = isAiParseError(e);
    const fallback = unknownFallback({
      ai_uncertainty_reason: parseFailed
        ? UNCERTAINTY_REASONS.parse_failed
        : listingHint ?? UNCERTAINTY_REASONS.hard_to_estimate,
      reasoning_summary:
        e instanceof Error ? e.message : "AI değerlendirmesi şu an kullanılamıyor.",
    });
    return NextResponse.json(fallback, { status: 200 });
  }
}
