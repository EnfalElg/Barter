import type { PublicBarterSafety, SafetyRiskLevel } from "@/lib/barter-safety";
import type { MeetingSuggestion } from "@/lib/meeting-suggestions";

/** DB + API offer lifecycle */
export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export type SwapRating = {
  id: string;
  offer_id: string;
  rater_id: string;
  rated_user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

/** Keşfet bundle API / kart — hassas sayı yok */
export type BundleExploreMatch = {
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
  value_match_score: number;
  match_label: string;
  wish_category_label?: string | null;
  wish_keyword_label?: string | null;
};

/** Client-safe bundle match (no value_match_score). */
export type BundleExploreMatchPublic = Omit<
  BundleExploreMatch,
  "value_match_score"
>;

export type OfferPreviewResult = {
  match_label: string;
  safety: PublicBarterSafety;
};

export type SwapOfferListRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  requested_product_id: string;
  status: OfferStatus;
  message: string | null;
  value_match_score: number | null;
  match_label: string | null;
  safety_risk_level: SafetyRiskLevel | null;
  safety_label: string | null;
  created_at: string;
  updated_at: string;
};

import type { AIBadgeColor } from "@/lib/types/product";

export type OfferProductSnippet = {
  id: string;
  title: string;
  image_url: string | null;
  ai_badge_label: string | null;
  ai_badge_color: AIBadgeColor | null;
  ai_value_status?: string | null;
  description_length?: number;
  location?: string | null;
};

export type OfferCounterpartyTrust = {
  user_id: string;
  display_name: string;
  trust_score: number;
  completed_swaps: number;
  rating_average: number;
  rating_count: number;
};

export type OfferListItem = SwapOfferListRow & {
  requested: OfferProductSnippet | null;
  offered: OfferProductSnippet[];
  /** Current user already rated the other party for this offer */
  has_rated: boolean;
  other_user_id: string;
  counterparty: OfferCounterpartyTrust;
  safety: PublicBarterSafety;
  trade_location_message: string | null;
  meeting_suggestions: MeetingSuggestion[];
};
