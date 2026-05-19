import {
  evaluateBarterSafety,
  type BarterSafetyInput,
  type BarterSafetyResult,
  type PublicBarterSafety,
  type SafetyColor,
  type SafetyRiskLevel,
  toPublicSafety,
} from "@/lib/barter-safety";
import { normalizeParticipants } from "@/lib/chat.server";
import { locationsMatch } from "@/lib/geo";
import type { SupabaseClient } from "@supabase/supabase-js";

const PRODUCT_SAFETY_SELECT =
  "id, owner_id, image_url, description, location, ai_value_status";

const PROFILE_SAFETY_SELECT = "id, location, trust_score, completed_swaps";

type ProductSafetyRow = {
  id: string;
  owner_id: string;
  image_url: string | null;
  description: string | null;
  location: string | null;
  ai_value_status: string | null;
};

type ProfileSafetyRow = {
  id: string;
  location: string | null;
  trust_score: number | null;
  completed_swaps: number | null;
};

export type OfferSafetyContext = {
  requesterId: string;
  ownerId: string;
  requestedProductId: string;
  offeredProductIds: string[];
  matchLabel?: string | null;
  offerStatus?: string | null;
};

export const SAFETY_COLOR_BY_LEVEL: Record<SafetyRiskLevel, SafetyColor> = {
  low: "green",
  medium: "orange",
  high: "red",
  unknown: "gray",
};

function descLength(description: string | null | undefined): number {
  return (description ?? "").trim().length;
}

function hasImage(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl?.trim());
}

async function hasChatBetweenUsers(
  supabase: SupabaseClient,
  userA: string,
  userB: string,
  productId: string
): Promise<boolean> {
  const { participant_a, participant_b } = normalizeParticipants(userA, userB);

  const { data } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("participant_a", participant_a)
    .eq("participant_b", participant_b)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function buildOfferSafetyInput(
  supabase: SupabaseClient,
  ctx: OfferSafetyContext
): Promise<BarterSafetyInput> {
  const productIds = [ctx.requestedProductId, ...ctx.offeredProductIds];
  const userIds = [ctx.requesterId, ctx.ownerId];

  const [{ data: productRows }, { data: profileRows }, hasChatThread] = await Promise.all([
    supabase.from("products").select(PRODUCT_SAFETY_SELECT).in("id", productIds),
    supabase.from("profiles").select(PROFILE_SAFETY_SELECT).in("id", userIds),
    hasChatBetweenUsers(supabase, ctx.requesterId, ctx.ownerId, ctx.requestedProductId),
  ]);

  const products = (productRows ?? []) as ProductSafetyRow[];
  const requested = products.find((p) => p.id === ctx.requestedProductId);
  const offered = ctx.offeredProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is ProductSafetyRow => Boolean(p));

  const profiles = (profileRows ?? []) as ProfileSafetyRow[];
  const requesterProfile = profiles.find((p) => p.id === ctx.requesterId);
  const ownerProfile = profiles.find((p) => p.id === ctx.ownerId);

  const requesterLocation = requesterProfile?.location ?? null;
  const requestedLocation = requested?.location ?? null;

  const locationCandidates = [
    requesterLocation,
    ownerProfile?.location ?? null,
    ...offered.map((p) => p.location),
  ];

  const sameLocationText = locationCandidates.some((loc) =>
    locationsMatch(loc, requestedLocation)
  );

  return {
    requesterTrustScore: requesterProfile?.trust_score ?? null,
    ownerTrustScore: ownerProfile?.trust_score ?? null,
    requesterCompletedSwaps: requesterProfile?.completed_swaps ?? null,
    ownerCompletedSwaps: ownerProfile?.completed_swaps ?? null,
    requestedProductAiStatus: requested?.ai_value_status ?? null,
    offeredProductAiStatuses: offered.map((p) => p.ai_value_status ?? "unknown"),
    requestedProductHasImage: requested ? hasImage(requested.image_url) : undefined,
    offeredProductsHaveImages: offered.map((p) => hasImage(p.image_url)),
    requestedProductDescriptionLength: requested
      ? descLength(requested.description)
      : undefined,
    offeredProductDescriptionLengths: offered.map((p) => descLength(p.description)),
    offerMatchLabel: ctx.matchLabel ?? null,
    offerStatus: ctx.offerStatus ?? null,
    sameLocationText,
    hasChatThread,
  };
}

export async function evaluateOfferSafety(
  supabase: SupabaseClient,
  ctx: OfferSafetyContext
): Promise<BarterSafetyResult> {
  const input = await buildOfferSafetyInput(supabase, ctx);
  return evaluateBarterSafety(input);
}

export async function evaluateOfferSafetyPublic(
  supabase: SupabaseClient,
  ctx: OfferSafetyContext
): Promise<PublicBarterSafety> {
  return toPublicSafety(await evaluateOfferSafety(supabase, ctx));
}

const SNAPSHOT_FALLBACK_TIPS = [
  "Yüz yüze takasta kalabalık ve güvenli bir yer seç.",
  "Ürünü teslim almadan önce kontrol et.",
  "Şüpheli durumda sohbet üzerinden ek fotoğraf veya bilgi iste.",
] as const;

export function safetyFromSnapshot(
  riskLevel: string | null | undefined,
  label: string | null | undefined
): PublicBarterSafety | null {
  if (!riskLevel || !label) return null;
  const level = riskLevel as SafetyRiskLevel;
  if (!["low", "medium", "high", "unknown"].includes(level)) return null;
  return {
    risk_level: level,
    label,
    color: SAFETY_COLOR_BY_LEVEL[level],
    signals: [],
    tips: [...SNAPSHOT_FALLBACK_TIPS],
  };
}
