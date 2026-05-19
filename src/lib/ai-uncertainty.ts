/** Turkish copy shown to owners when ai_value_status is "unknown". */
export const UNCERTAINTY_REASONS = {
  missing_range: "AI makul bir değer aralığı oluşturamadı.",
  low_confidence: "AI bu tahminden yeterince emin değil.",
  parse_failed: "AI değerlendirmesi okunamadı.",
  insufficient_detail: "Ürün bilgisi yeterince detaylı değil.",
  image_mismatch: "Görsel ve ürün bilgisi uyumsuz olabilir.",
  brand_model_missing: "Marka, model veya kondisyon bilgisi eksik olabilir.",
  hard_to_estimate: "Bu ürün için güvenilir tahmin yapmak zor.",
} as const;

export type UncertaintyReasonKey = keyof typeof UNCERTAINTY_REASONS;

export const AI_UNCERTAINTY_TIPS = [
  "Marka/model ekle",
  "Kondisyonu daha net yaz",
  "Daha net fotoğraf yükle",
  "Varsa kutu, garanti veya eksik parça bilgisini belirt",
] as const;

export type ListingDetailInput = {
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url?: string;
};

/** Heuristic hint when AI could not produce a range (owner-only). */
export function inferListingDetailReason(input: ListingDetailInput): string | null {
  const title = input.title.trim();
  const desc = input.description.trim();
  const combined = `${title} ${desc}`.toLowerCase();

  if (title.length < 6 || desc.length < 16) {
    return UNCERTAINTY_REASONS.insufficient_detail;
  }

  const hasBrandOrModel =
    /\b(marka|model|gb|g\b|inch|inç|cm|ml|adet|seri|pro\b|max\b|mini\b|plus\b)\b/i.test(
      combined
    ) || title.split(/\s+/).length >= 4;

  if (!hasBrandOrModel) {
    return UNCERTAINTY_REASONS.brand_model_missing;
  }

  if (!input.image_url?.trim()) {
    return null;
  }

  return null;
}

export function isAiParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes("json") ||
    m.includes("parse") ||
    m.includes("invalid string") ||
    m.includes("invalid number") ||
    m.includes("expected json")
  );
}

export function resolveUnknownReason(params: {
  userValue: number;
  aiMin: number | null | undefined;
  aiMax: number | null | undefined;
  aiConfidence: number | null | undefined;
  listingHint?: string | null;
}): string {
  const conf = params.aiConfidence ?? 0;
  const missingRange =
    params.aiMin == null ||
    params.aiMax == null ||
    !Number.isFinite(params.aiMin) ||
    !Number.isFinite(params.aiMax) ||
    params.aiMin <= 0 ||
    params.aiMax <= 0 ||
    (params.aiMin as number) > (params.aiMax as number);

  if (missingRange) {
    return params.listingHint ?? UNCERTAINTY_REASONS.missing_range;
  }

  if (conf < 0.45) {
    return UNCERTAINTY_REASONS.low_confidence;
  }

  const aiMid =
    params.aiMin != null &&
    params.aiMax != null &&
    Number.isFinite(params.aiMin) &&
    Number.isFinite(params.aiMax)
      ? (params.aiMin + params.aiMax) / 2
      : NaN;

  if (!Number.isFinite(aiMid) || aiMid <= 0 || !Number.isFinite(params.userValue)) {
    return UNCERTAINTY_REASONS.hard_to_estimate;
  }

  return UNCERTAINTY_REASONS.hard_to_estimate;
}
