import { evaluateBarterSafety, toPublicSafety } from "@/lib/barter-safety";
import { getLocationHint, tradeLocationMessage } from "@/lib/location-utils";
import { getMeetingSuggestions, trustRiskFromScore } from "@/lib/meeting-suggestions";
import {
  fallbackProfileView,
  fetchProfileLocationContext,
  toPublicProfile,
  toProfileView,
} from "@/lib/profiles.server";
import {
  evaluateOfferSafetyPublic,
  safetyFromSnapshot,
} from "@/lib/server/offer-safety.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AIBadgeColor } from "@/lib/types/product";
import type {
  OfferCounterpartyTrust,
  OfferListItem,
  OfferProductSnippet,
  OfferStatus,
  SwapOfferListRow,
} from "@/lib/types/swap-offer";

function asOfferStatus(s: string): OfferStatus {
  if (
    s === "accepted" ||
    s === "rejected" ||
    s === "cancelled" ||
    s === "completed" ||
    s === "pending"
  ) {
    return s;
  }
  return "pending";
}

export async function loadOffersPageData(userId: string): Promise<{
  incoming: OfferListItem[];
  outgoing: OfferListItem[];
}> {
  const supabase = await createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from("swap_offers")
    .select(
      "id, from_user_id, to_user_id, requested_product_id, status, message, match_label, safety_risk_level, safety_label, created_at, updated_at"
    )
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[offers list]", error.message);
    return { incoming: [], outgoing: [] };
  }

  if (!rows?.length) {
    return { incoming: [], outgoing: [] };
  }

  const list = rows as Record<string, unknown>[];
  const offerRows: SwapOfferListRow[] = list.map((r) => ({
    id: String(r.id),
    from_user_id: String(r.from_user_id),
    to_user_id: String(r.to_user_id),
    requested_product_id: String(r.requested_product_id),
    status: asOfferStatus(String(r.status ?? "pending")),
    message: r.message == null ? null : String(r.message),
    value_match_score: null,
    match_label: r.match_label == null ? null : String(r.match_label),
    safety_risk_level:
      r.safety_risk_level == null ? null : (String(r.safety_risk_level) as SwapOfferListRow["safety_risk_level"]),
    safety_label: r.safety_label == null ? null : String(r.safety_label),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? r.created_at ?? ""),
  }));

  const offerIds = offerRows.map((o) => o.id);

  const { data: itemRows } = await supabase
    .from("swap_offer_items")
    .select("offer_id, product_id")
    .in("offer_id", offerIds);

  const ratedOfferIds = new Set<string>();
  const { data: ratingRows, error: ratingErr } = await supabase
    .from("swap_ratings")
    .select("offer_id")
    .eq("rater_id", userId)
    .in("offer_id", offerIds);

  if (!ratingErr) {
    for (const r of ratingRows ?? []) {
      ratedOfferIds.add(String((r as { offer_id: string }).offer_id));
    }
  }

  const productIds = new Set<string>();
  for (const o of offerRows) {
    productIds.add(o.requested_product_id);
  }
  for (const it of itemRows ?? []) {
    const row = it as { product_id?: string };
    if (row.product_id) productIds.add(String(row.product_id));
  }

  const viewerLoc = await fetchProfileLocationContext(userId);

  const { data: prodRows } = await supabase
    .from("products")
    .select(
      "id, title, image_url, ai_badge_label, ai_badge_color, ai_value_status, description, location, lat, lng"
    )
    .in("id", [...productIds]);

  const pmap = new Map<string, OfferProductSnippet>();
  for (const p of prodRows ?? []) {
    const row = p as Record<string, unknown>;
    const desc = row.description == null ? "" : String(row.description);
    pmap.set(String(row.id), {
      id: String(row.id),
      title: String(row.title ?? ""),
      image_url: row.image_url == null ? null : String(row.image_url),
      ai_badge_label: row.ai_badge_label == null ? null : String(row.ai_badge_label),
      ai_badge_color: (row.ai_badge_color == null
        ? null
        : (String(row.ai_badge_color) as AIBadgeColor)),
      ai_value_status: row.ai_value_status == null ? null : String(row.ai_value_status),
      description_length: desc.trim().length,
      location: row.location == null ? null : String(row.location),
    });
  }

  const otherUserIds = new Set<string>();
  for (const o of offerRows) {
    otherUserIds.add(o.from_user_id === userId ? o.to_user_id : o.from_user_id);
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, avatar_url, location, bio, trust_score, completed_swaps, rating_average, rating_count, created_at"
    )
    .in("id", [...otherUserIds]);

  const profileMap = new Map<string, OfferCounterpartyTrust>();
  for (const id of otherUserIds) {
    const row = (profileRows ?? []).find((p) => String((p as { id: string }).id) === id);
    const view = row
      ? toProfileView(toPublicProfile(row as Record<string, unknown>))
      : fallbackProfileView(id);
    profileMap.set(id, {
      user_id: id,
      display_name: view.display_name,
      trust_score: view.trust_score,
      completed_swaps: view.completed_swaps,
      rating_average: view.rating_average,
      rating_count: view.rating_count,
    });
  }

  const itemsByOffer = new Map<string, string[]>();
  for (const it of itemRows ?? []) {
    const row = it as { offer_id?: string; product_id?: string };
    const oid = String(row.offer_id ?? "");
    const pid = String(row.product_id ?? "");
    if (!oid || !pid) continue;
    const arr = itemsByOffer.get(oid) ?? [];
    arr.push(pid);
    itemsByOffer.set(oid, arr);
  }

  async function enrich(o: SwapOfferListRow, tab: "in" | "out"): Promise<OfferListItem> {
    const offeredIds = itemsByOffer.get(o.id) ?? [];
    const otherUserId = tab === "in" ? o.from_user_id : o.to_user_id;
    const requesterId = o.from_user_id;
    const ownerId = o.to_user_id;
    const requested = pmap.get(o.requested_product_id) ?? null;
    const offered = offeredIds
      .map((id) => pmap.get(id))
      .filter((x): x is OfferProductSnippet => Boolean(x));

    const counterparty = (() => {
      const hit = profileMap.get(otherUserId);
      if (hit) return hit;
      const fb = fallbackProfileView(otherUserId);
      return {
        user_id: otherUserId,
        display_name: fb.display_name,
        trust_score: fb.trust_score,
        completed_swaps: fb.completed_swaps,
        rating_average: fb.rating_average,
        rating_count: fb.rating_count,
      };
    })();

    let safety: OfferListItem["safety"];
    try {
      safety = await evaluateOfferSafetyPublic(supabase, {
        requesterId,
        ownerId,
        requestedProductId: o.requested_product_id,
        offeredProductIds: offeredIds,
        matchLabel: o.match_label,
        offerStatus: o.status,
      });
    } catch {
      safety =
        safetyFromSnapshot(o.safety_risk_level, o.safety_label) ??
        toPublicSafety(
          evaluateBarterSafety({
            requesterTrustScore:
              requesterId === userId ? null : counterparty.user_id === requesterId
                ? counterparty.trust_score
                : null,
            ownerTrustScore:
              ownerId === userId ? null : counterparty.user_id === ownerId
                ? counterparty.trust_score
                : null,
            requesterCompletedSwaps:
              requesterId === userId ? null : counterparty.user_id === requesterId
                ? counterparty.completed_swaps
                : null,
            ownerCompletedSwaps:
              ownerId === userId ? null : counterparty.user_id === ownerId
                ? counterparty.completed_swaps
                : null,
            requestedProductAiStatus: requested?.ai_value_status ?? null,
            offeredProductAiStatuses: offered.map((p) => p.ai_value_status ?? "unknown"),
            requestedProductHasImage: Boolean(requested?.image_url),
            offeredProductsHaveImages: offered.map((p) => Boolean(p.image_url)),
            requestedProductDescriptionLength: requested?.description_length ?? 0,
            offeredProductDescriptionLengths: offered.map((p) => p.description_length ?? 0),
            offerMatchLabel: o.match_label,
            offerStatus: o.status,
          })
        );
    }

    const tradeProduct =
      tab === "out" ? requested : offered[0] ?? requested;
    const tradeHint =
      viewerLoc.location && tradeProduct?.location
        ? getLocationHint({
            userLocationText: viewerLoc.location,
            productLocationText: tradeProduct.location,
            userLat: viewerLoc.lat,
            userLng: viewerLoc.lng,
          })
        : null;
    const trade_location_message = tradeHint ? tradeLocationMessage(tradeHint) : null;
    const meeting_suggestions = getMeetingSuggestions({
      locationHintLevel: tradeHint?.level,
      sameCity:
        tradeHint?.level === "same_city" || tradeHint?.level === "same_area",
      trustRiskLevel: trustRiskFromScore(counterparty.trust_score),
    });

    return {
      ...o,
      requested,
      offered,
      has_rated: ratedOfferIds.has(o.id),
      other_user_id: otherUserId,
      counterparty,
      safety,
      trade_location_message,
      meeting_suggestions,
    };
  }

  const incoming = await Promise.all(
    offerRows.filter((o) => o.to_user_id === userId).map((o) => enrich(o, "in"))
  );
  const outgoing = await Promise.all(
    offerRows.filter((o) => o.from_user_id === userId).map((o) => enrich(o, "out"))
  );

  return { incoming, outgoing };
}
