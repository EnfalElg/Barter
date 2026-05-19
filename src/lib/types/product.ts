/** Stored AI assessment categories (DB + API). */
export type AIValueStatus =
  | "fair"
  | "slightly_low"
  | "very_low"
  | "slightly_high"
  | "very_high"
  | "unknown";

/** UI / DB badge color token. */
export type AIBadgeColor =
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "dark_red"
  | "gray";

export type ProductStatus =
  | "available"
  | "hidden"
  | "paused"
  | "traded"
  | "swapped"
  | "reserved"
  | "deleted";

/** Full product row as stored in Supabase (owner-visible via direct table read). */
export type ProductRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  status: ProductStatus;
  user_value: number;
  ai_min_value: number | null;
  ai_max_value: number | null;
  ai_confidence: number | null;
  ai_value_deviation: number | null;
  ai_value_status: AIValueStatus | null;
  ai_badge_label: string | null;
  ai_badge_color: AIBadgeColor | null;
  ai_uncertainty_reason: string | null;
  is_value_hidden: boolean;
  created_at: string;
  /** Legacy geo / qty (still in DB). */
  quantity: number;
  unit: string;
  lat: number | null;
  lng: number | null;
  city: string;
  tags: string[];
  wanted_categories: string[];
  wanted_keywords: string[];
};

/** Safe for any viewer — never includes private values. */
export type PublicProduct = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  status: ProductStatus;
  ai_value_status: AIValueStatus | null;
  ai_badge_label: string | null;
  ai_badge_color: AIBadgeColor | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  city: string;
  tags: string[];
  quantity: number;
  unit: string;
  wanted_categories: string[];
  wanted_keywords: string[];
};

export type OwnerProduct = PublicProduct & {
  user_value: number;
  ai_min_value: number | null;
  ai_max_value: number | null;
  ai_confidence: number | null;
  ai_value_deviation: number | null;
  ai_uncertainty_reason: string | null;
};

/** POST /api/ai/value-check response body. */
export type ValueCheckResult = {
  ai_min_value: number | null;
  ai_max_value: number | null;
  ai_confidence: number;
  ai_value_deviation: number | null;
  ai_value_status: AIValueStatus;
  ai_badge_label: string;
  ai_badge_color: AIBadgeColor;
  ai_uncertainty_reason: string | null;
  reasoning_summary: string;
};

/** GET /api/products/[id]/matches item — yanıtta hassas sayısal alan yok. */
export type MatchProduct = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  description_preview: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  status: ProductStatus;
  ai_value_status: AIValueStatus | null;
  ai_badge_label: string | null;
  ai_badge_color: AIBadgeColor | null;
  value_match_score: number;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
};

/** Server-side list row with private value for ±% matching (never sent to client). */
export type ProductMatchSource = PublicProduct & {
  user_value: number;
};

/** Takas teklifi ekranı — sunucunun hesapladığı uyum skoru (fiyat yok). */
export type OfferPickRow = {
  id: string;
  title: string;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  ai_value_status: AIValueStatus | null;
  ai_badge_label: string | null;
  ai_badge_color: AIBadgeColor | null;
  value_match_score: number;
};
