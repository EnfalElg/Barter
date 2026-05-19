import { resolveUnknownReason } from "@/lib/ai-uncertainty";
import { isValidGeoCoord } from "@/lib/geo";
import { wantedPrefsFromRow } from "@/lib/wanted";
import type {
  AIValueStatus,
  AIBadgeColor,
  MatchProduct,
  OfferPickRow,
  OwnerProduct,
  ProductMatchSource,
  ProductStatus,
  PublicProduct,
} from "@/lib/types/product";

function parseGeoCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseProductCoords(row: Record<string, unknown>): {
  lat: number | null;
  lng: number | null;
} {
  const lat = parseGeoCoord(row.lat ?? row.latitude);
  const lng = parseGeoCoord(row.lng ?? row.longitude);
  if (!isValidGeoCoord(lat, lng)) {
    return { lat: null, lng: null };
  }
  return { lat, lng };
}

export type AIBadgeEvaluation = {
  ai_value_status: AIValueStatus;
  ai_badge_label: string;
  ai_badge_color: AIBadgeColor;
  ai_value_deviation: number | null;
  ai_uncertainty_reason: string | null;
};

export type EvaluateAIBadgeOptions = {
  /** Extra hint when range is missing (e.g. short description). */
  listingHint?: string | null;
  /** Caller override (parse failure, API message). */
  uncertaintyReason?: string | null;
};

/**
 * Maps user-entered value vs AI range to public badge (Turkish labels).
 * Rules: unknown if range incomplete or aiConfidence < 0.45.
 */
function unknownBadge(
  userValue: number,
  aiMin: number | null | undefined,
  aiMax: number | null | undefined,
  aiConfidence: number | null | undefined,
  options?: EvaluateAIBadgeOptions
): AIBadgeEvaluation {
  const reason =
    options?.uncertaintyReason?.trim() ||
    resolveUnknownReason({
      userValue,
      aiMin,
      aiMax,
      aiConfidence,
      listingHint: options?.listingHint,
    });
  return {
    ai_value_status: "unknown",
    ai_badge_label: "AI emin değil",
    ai_badge_color: "gray",
    ai_value_deviation: null,
    ai_uncertainty_reason: reason,
  };
}

export function evaluateAIBadge(
  userValue: number,
  aiMin: number | null | undefined,
  aiMax: number | null | undefined,
  aiConfidence: number | null | undefined,
  options?: EvaluateAIBadgeOptions
): AIBadgeEvaluation {
  const conf = aiConfidence ?? 0;
  if (
    aiMin == null ||
    aiMax == null ||
    !Number.isFinite(aiMin) ||
    !Number.isFinite(aiMax) ||
    aiMin <= 0 ||
    aiMax <= 0 ||
    aiMin > aiMax ||
    conf < 0.45
  ) {
    return unknownBadge(userValue, aiMin, aiMax, aiConfidence, options);
  }

  const aiMid = (aiMin + aiMax) / 2;
  if (!Number.isFinite(aiMid) || aiMid <= 0 || !Number.isFinite(userValue)) {
    return unknownBadge(userValue, aiMin, aiMax, aiConfidence, options);
  }

  const deviation = (userValue - aiMid) / aiMid;

  if (deviation >= -0.1 && deviation <= 0.1) {
    return {
      ai_value_status: "fair",
      ai_badge_label: "Makul değer",
      ai_badge_color: "green",
      ai_value_deviation: deviation,
      ai_uncertainty_reason: null,
    };
  }
  if (deviation < -0.1 && deviation >= -0.3) {
    return {
      ai_value_status: "slightly_low",
      ai_badge_label: "Biraz düşük olabilir",
      ai_badge_color: "yellow",
      ai_value_deviation: deviation,
      ai_uncertainty_reason: null,
    };
  }
  if (deviation < -0.3) {
    return {
      ai_value_status: "very_low",
      ai_badge_label: "Çok düşük olabilir",
      ai_badge_color: "orange",
      ai_value_deviation: deviation,
      ai_uncertainty_reason: null,
    };
  }
  if (deviation > 0.1 && deviation <= 0.3) {
    return {
      ai_value_status: "slightly_high",
      ai_badge_label: "Biraz yüksek olabilir",
      ai_badge_color: "red",
      ai_value_deviation: deviation,
      ai_uncertainty_reason: null,
    };
  }
  return {
    ai_value_status: "very_high",
    ai_badge_label: "Çok yüksek olabilir",
    ai_badge_color: "dark_red",
    ai_value_deviation: deviation,
    ai_uncertainty_reason: null,
  };
}

export function calculateValueMatchScore(
  myValue: number,
  otherValue: number
): number {
  if (
    !Number.isFinite(myValue) ||
    !Number.isFinite(otherValue) ||
    myValue <= 0 ||
    otherValue <= 0
  ) {
    return 0;
  }
  const lo = Math.min(myValue, otherValue);
  const hi = Math.max(myValue, otherValue);
  return Math.round((lo / hi) * 100);
}

export function swapBalanceLabel(score: number): string {
  if (score >= 90) return "Çok denk takas";
  if (score >= 75) return "Dengeli takas";
  if (score >= 60) return "Biraz dengesiz";
  return "Dengesiz takas";
}

/** Denk takas uyum etiketi (swapBalanceLabel ile aynı). */
export function getMatchLabel(score: number): string {
  return swapBalanceLabel(score);
}

export function stripPrivateMatchSource(src: ProductMatchSource): PublicProduct {
  const { user_value, ...pub } = src;
  void user_value;
  return pub;
}

function normalizeProductStatus(v: string | null | undefined): ProductStatus {
  const s = String(v ?? "available").toLowerCase();
  if (s === "traded") return "swapped";
  if (
    s === "available" ||
    s === "hidden" ||
    s === "paused" ||
    s === "swapped" ||
    s === "reserved" ||
    s === "deleted"
  ) {
    return s;
  }
  return "available";
}

function normalizeStatus(v: string | null | undefined): AIValueStatus {
  const s = String(v ?? "unknown").toLowerCase();
  if (
    s === "fair" ||
    s === "slightly_low" ||
    s === "very_low" ||
    s === "slightly_high" ||
    s === "very_high" ||
    s === "unknown"
  ) {
    return s;
  }
  return "unknown";
}

function normalizeColor(v: string | null | undefined): AIBadgeColor {
  const c = String(v ?? "gray").toLowerCase();
  if (
    c === "green" ||
    c === "yellow" ||
    c === "orange" ||
    c === "red" ||
    c === "dark_red" ||
    c === "gray"
  ) {
    return c;
  }
  return "gray";
}

export function sanitizePublicProduct(row: Record<string, unknown>): PublicProduct {
  const tagsRaw = row.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === "string")
    : [];

  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    category: String(row.category ?? "Genel"),
    condition: String(row.condition ?? "Belirtilmedi"),
    image_url:
      row.image_url === null || row.image_url === undefined
        ? null
        : String(row.image_url),
    location: String(row.location ?? row.city ?? ""),
    status: normalizeProductStatus(row.status as string | undefined),
    ai_value_status: normalizeStatus(row.ai_value_status as string | undefined),
    ai_badge_label:
      row.ai_badge_label === null || row.ai_badge_label === undefined
        ? null
        : String(row.ai_badge_label),
    ai_badge_color: normalizeColor(row.ai_badge_color as string | undefined),
    created_at: row.created_at != null ? String(row.created_at) : new Date().toISOString(),
    ...parseProductCoords(row),
    city: String(row.city ?? ""),
    tags,
    quantity: Number(row.quantity ?? 1),
    unit: String(row.unit ?? "piece"),
    ...wantedPrefsFromRow(row),
  };
}

export function sanitizeOwnerProduct(row: Record<string, unknown>): OwnerProduct {
  const pub = sanitizePublicProduct(row);
  return {
    ...pub,
    user_value: Number(row.user_value ?? 0),
    ai_min_value:
      row.ai_min_value === null || row.ai_min_value === undefined
        ? null
        : Number(row.ai_min_value),
    ai_max_value:
      row.ai_max_value === null || row.ai_max_value === undefined
        ? null
        : Number(row.ai_max_value),
    ai_confidence:
      row.ai_confidence === null || row.ai_confidence === undefined
        ? null
        : Number(row.ai_confidence),
    ai_value_deviation:
      row.ai_value_deviation === null || row.ai_value_deviation === undefined
        ? null
        : Number(row.ai_value_deviation),
    ai_uncertainty_reason:
      row.ai_uncertainty_reason === null || row.ai_uncertainty_reason === undefined
        ? null
        : String(row.ai_uncertainty_reason),
  };
}

export function sanitizeOfferPickRow(row: Record<string, unknown>): OfferPickRow {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category ?? ""),
    condition: String(row.condition ?? ""),
    image_url:
      row.image_url === null || row.image_url === undefined
        ? null
        : String(row.image_url),
    location: String(row.location ?? ""),
    ai_value_status: normalizeStatus(row.ai_value_status as string | undefined),
    ai_badge_label:
      row.ai_badge_label === null || row.ai_badge_label === undefined
        ? null
        : String(row.ai_badge_label),
    ai_badge_color: normalizeColor(row.ai_badge_color as string | undefined),
    value_match_score: Math.round(Number(row.value_match_score ?? 0)),
  };
}

export function sanitizeMatchProduct(row: Record<string, unknown>): MatchProduct {
  const previewRaw =
    row.description_preview !== undefined && row.description_preview !== null
      ? String(row.description_preview)
      : row.description !== undefined && row.description !== null
        ? String(row.description)
        : null;
  const preview =
    previewRaw && previewRaw.length > 280
      ? `${previewRaw.slice(0, 277)}…`
      : previewRaw;

  return {
    id: String(row.id),
    owner_id: String(row.owner_id ?? ""),
    title: String(row.title),
    description: preview,
    description_preview: preview,
    category: String(row.category ?? ""),
    condition: String(row.condition ?? ""),
    image_url:
      row.image_url === null || row.image_url === undefined
        ? null
        : String(row.image_url),
    location: String(row.location ?? ""),
    status: normalizeProductStatus(row.status as string | undefined),
    ai_value_status: normalizeStatus(row.ai_value_status as string | undefined),
    ai_badge_label:
      row.ai_badge_label === null || row.ai_badge_label === undefined
        ? null
        : String(row.ai_badge_label),
    ai_badge_color: normalizeColor(row.ai_badge_color as string | undefined),
    value_match_score: Math.round(Number(row.value_match_score ?? 0)),
    created_at: row.created_at != null ? String(row.created_at) : new Date().toISOString(),
  };
}

/** Turkish short explanation for AI result screen / product detail. */
export function aiStatusExplanation(status: AIValueStatus): string {
  switch (status) {
    case "fair":
      return "Bu değer makul görünüyor.";
    case "slightly_low":
      return "Bu değer biraz düşük olabilir.";
    case "very_low":
      return "Bu değer çok düşük olabilir.";
    case "slightly_high":
      return "Bu değer biraz yüksek olabilir.";
    case "very_high":
      return "Bu değer çok yüksek olabilir.";
    default:
      return "AI bu ürün için yeterince emin değil.";
  }
}
