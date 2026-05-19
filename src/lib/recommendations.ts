import { getLocationHint, locationReasonFromHint } from "@/lib/location-utils";
import { sanitizePublicProduct } from "@/lib/product-value";
import type { AIValueStatus, PublicProduct } from "@/lib/types/product";
import {
  collectWantedFromProducts,
  mergeWantedPrefs,
  type WantedPrefs,
  wishFitPoints,
} from "@/lib/wanted";

/** Server-side only — includes private user_value. */
export type OwnProduct = {
  id: string;
  category: string;
  location: string;
  user_value: number;
  wanted_categories?: string[];
  wanted_keywords?: string[];
};

/** Server-side candidate row before sanitization. */
export type CandidateProductRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  status: string;
  ai_value_status: string | null;
  ai_badge_label: string | null;
  ai_badge_color: string | null;
  created_at: string;
  user_value: number;
  lat?: number | null;
  lng?: number | null;
  owner_trust_score?: number | null;
};

export type PublicCandidateProduct = PublicProduct;

export type RecommendationLabel =
  | "Çok uygun takas adayı"
  | "Uygun takas adayı"
  | "Düşünülebilir"
  | "Zayıf eşleşme";

export type RecommendationLevel = "excellent" | "good" | "okay" | "weak";

export type RecommendationResult = {
  product: PublicCandidateProduct;
  recommendation_label: RecommendationLabel;
  recommendation_level: RecommendationLevel;
  reasons: string[];
};

export type RecommendationInput = {
  selectedProducts: OwnProduct[];
  candidateProducts: CandidateProductRow[];
  currentUserLocation?: string | null;
  currentUserLat?: number | null;
  currentUserLng?: number | null;
  profileWanted?: WantedPrefs | null;
};

const COMPLEMENTARY_PAIRS: [string, string][] = [
  ["Elektronik", "Oyun & Konsol"],
  ["Elektronik", "Müzik"],
  ["Kitap & Hobi", "Müzik"],
  ["Spor", "Kamp & Outdoor"],
  ["Ev & Yaşam", "Elektronik"],
];

function isComplementaryCategory(a: string, b: string): boolean {
  const na = a.trim();
  const nb = b.trim();
  if (!na || !nb) return false;
  return COMPLEMENTARY_PAIRS.some(
    ([x, y]) => (x === na && y === nb) || (x === nb && y === na)
  );
}

function valueSimilarityPoints(selectedTotal: number, candidateValue: number): number {
  if (selectedTotal <= 0 || candidateValue <= 0) return 0;
  const lo = Math.min(selectedTotal, candidateValue);
  const hi = Math.max(selectedTotal, candidateValue);
  return Math.round(45 * (lo / hi));
}

function categoryFitPoints(
  candidateCategory: string,
  selectedCategories: Set<string>
): { points: number; same: boolean; complementary: boolean } {
  let same = false;
  let complementary = false;
  for (const cat of selectedCategories) {
    if (cat === candidateCategory) same = true;
    if (isComplementaryCategory(cat, candidateCategory)) complementary = true;
  }
  if (complementary) return { points: 15, same, complementary };
  if (same) return { points: 10, same, complementary };
  return { points: 5, same, complementary };
}

function locationPoints(
  candidateLocation: string,
  candidateLat: number | null | undefined,
  candidateLng: number | null | undefined,
  viewerLocation?: string | null,
  viewerLat?: number | null,
  viewerLng?: number | null
): { points: number; reason: string | null } {
  if (!viewerLocation?.trim()) {
    return { points: 0, reason: null };
  }

  const hint = getLocationHint({
    userLocationText: viewerLocation,
    productLocationText: candidateLocation,
    userLat: viewerLat,
    userLng: viewerLng,
    productLat: candidateLat,
    productLng: candidateLng,
  });

  let points = 0;
  if (
    hint.level === "same_area" ||
    hint.level === "walking" ||
    hint.level === "nearby"
  ) {
    points = 15;
  } else if (hint.level === "same_city") {
    points = 8;
  }

  return { points, reason: locationReasonFromHint(hint) };
}

function aiBadgePoints(status: string | null | undefined): number {
  const s = String(status ?? "unknown").toLowerCase() as AIValueStatus;
  switch (s) {
    case "fair":
      return 10;
    case "slightly_low":
    case "slightly_high":
      return 6;
    case "very_low":
    case "very_high":
      return 2;
    default:
      return 0;
  }
}

function trustPoints(trust: number | null | undefined): number {
  if (trust == null || !Number.isFinite(trust)) return 3;
  const t = Math.round(trust);
  if (t >= 80) return 10;
  if (t >= 60) return 6;
  if (t >= 40) return 3;
  return 0;
}

function labelFromScore(score: number): {
  recommendation_label: RecommendationLabel;
  recommendation_level: RecommendationLevel;
} {
  if (score >= 80) {
    return { recommendation_label: "Çok uygun takas adayı", recommendation_level: "excellent" };
  }
  if (score >= 65) {
    return { recommendation_label: "Uygun takas adayı", recommendation_level: "good" };
  }
  if (score >= 45) {
    return { recommendation_label: "Düşünülebilir", recommendation_level: "okay" };
  }
  return { recommendation_label: "Zayıf eşleşme", recommendation_level: "weak" };
}

function buildReasons(flags: {
  valueStrong: boolean;
  categoryStrong: boolean;
  locationReason: string | null;
  aiStrong: boolean;
  trustStrong: boolean;
  wishCategory: boolean;
  wishKeyword: boolean;
  wishGeneral: boolean;
}): string[] {
  const reasons: string[] = [];
  if (flags.valueStrong) {
    reasons.push("Seçtiğin ürünlerle değer bandı yakın.");
  }
  if (flags.wishCategory) {
    reasons.push("Aradığın kategoriyle eşleşiyor.");
  }
  if (flags.wishKeyword) {
    reasons.push("İstek listendeki anahtar kelimeyle eşleşiyor.");
  }
  if (flags.wishGeneral) {
    reasons.push("Bu ürün tercihlerinle uyumlu.");
  }
  if (flags.locationReason) {
    reasons.push(flags.locationReason);
  }
  if (flags.categoryStrong) {
    reasons.push("Kategori olarak iyi eşleşiyor.");
  }
  if (flags.aiStrong) {
    reasons.push("AI değeri makul görünüyor.");
  }
  if (flags.trustStrong) {
    reasons.push("İlan sahibinin güven skoru yüksek.");
  }
  if (reasons.length === 0) {
    reasons.push("Genel takas uyumu değerlendirilebilir.");
  }
  return reasons.slice(0, 5);
}

export function toPublicCandidate(row: CandidateProductRow): PublicProduct {
  const { user_value: _uv, owner_trust_score: _ts, ...rest } = row;
  void _uv;
  void _ts;
  return sanitizePublicProduct(rest as Record<string, unknown>);
}

type Scored = RecommendationResult & { _score: number };

export function rankRecommendations(input: RecommendationInput): RecommendationResult[] {
  const selectedTotal = input.selectedProducts.reduce((s, p) => s + p.user_value, 0);
  const selectedCategories = new Set(input.selectedProducts.map((p) => p.category));
  const productWanted = collectWantedFromProducts(
    input.selectedProducts.map((p) => ({
      wanted_categories: p.wanted_categories ?? [],
      wanted_keywords: p.wanted_keywords ?? [],
    }))
  );
  const profileWanted = input.profileWanted ?? { wanted_categories: [], wanted_keywords: [] };
  const effectiveWanted =
    productWanted.wanted_categories.length > 0 || productWanted.wanted_keywords.length > 0
      ? productWanted
      : mergeWantedPrefs(productWanted, profileWanted);

  const scored: Scored[] = input.candidateProducts.map((candidate) => {
    const valuePts = valueSimilarityPoints(selectedTotal, candidate.user_value);
    const cat = categoryFitPoints(candidate.category, selectedCategories);
    const loc = locationPoints(
      candidate.location,
      candidate.lat,
      candidate.lng,
      input.currentUserLocation,
      input.currentUserLat,
      input.currentUserLng
    );
    const aiPts = aiBadgePoints(candidate.ai_value_status);
    const trustPts = trustPoints(candidate.owner_trust_score);
    const wish = wishFitPoints(
      {
        category: candidate.category,
        title: candidate.title,
        description: candidate.description,
      },
      effectiveWanted,
      profileWanted
    );

    const totalScore = valuePts + cat.points + loc.points + aiPts + trustPts + wish.points;
    const { recommendation_label, recommendation_level } = labelFromScore(totalScore);

    const reasons = buildReasons({
      valueStrong: valuePts >= 36,
      categoryStrong: cat.points >= 10,
      locationReason: loc.reason,
      aiStrong: aiPts >= 6,
      trustStrong: trustPts >= 6,
      wishCategory: wish.productCategoryMatch || wish.profileCategoryMatch,
      wishKeyword: wish.productKeywordMatch || wish.profileKeywordMatch,
      wishGeneral: wish.points >= 8 && !wish.productCategoryMatch && !wish.productKeywordMatch,
    });

    return {
      product: toPublicCandidate(candidate),
      recommendation_label,
      recommendation_level,
      reasons,
      _score: totalScore,
    };
  });

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return (
      new Date(b.product.created_at).getTime() - new Date(a.product.created_at).getTime()
    );
  });

  return scored.map(({ _score: _s, ...rest }) => {
    void _s;
    return rest;
  });
}
