import {
  rankRecommendations,
  type CandidateProductRow,
  type OwnProduct,
  type RecommendationResult,
} from "@/lib/recommendations";
import { wantedPrefsFromRow } from "@/lib/wanted";
import { sanitizePublicProduct } from "@/lib/product-value";
import type { SupabaseClient } from "@supabase/supabase-js";

const CANDIDATE_SELECT =
  "id, owner_id, title, description, category, condition, image_url, location, status, ai_value_status, ai_badge_label, ai_badge_color, created_at, user_value, lat, lng";

const VALUE_BAND_PCT = 40;
const MAX_CANDIDATES_FETCH = 150;

export async function computeRecommendations(
  supabase: SupabaseClient,
  userId: string,
  selectedProductIds: string[],
  limitInput: number,
  currentUserLocation?: string | null
): Promise<
  | { ok: true; selected_count: number; recommendations: RecommendationResult[] }
  | { ok: false; status: number; message: string }
> {
  const ids = [...new Set(selectedProductIds.map((x) => String(x).trim()))].filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, status: 400, message: "Öneri almak için en az bir ürün seçmelisin." };
  }
  if (ids.length > 10) {
    return { ok: false, status: 400, message: "En fazla 10 ürün seçebilirsin." };
  }

  let limit = Number.isFinite(limitInput) ? Math.round(limitInput) : 20;
  if (limit < 1) limit = 1;
  if (limit > 50) limit = 50;

  const { data: ownRows, error: ownErr } = await supabase
    .from("products")
    .select("id, category, location, user_value, owner_id, status, wanted_categories, wanted_keywords")
    .in("id", ids)
    .eq("owner_id", userId)
    .eq("status", "available");

  if (ownErr) {
    return { ok: false, status: 500, message: "Ürünler yüklenemedi." };
  }

  const owned = (ownRows ?? []) as {
    id: string;
    category: string;
    location: string;
    user_value: number | null;
    owner_id: string;
    status: string;
    wanted_categories: string[] | null;
    wanted_keywords: string[] | null;
  }[];

  if (owned.length !== ids.length) {
    return {
      ok: false,
      status: 403,
      message: "Sadece kendi ürünlerinle öneri alabilirsin.",
    };
  }

  const selectedProducts: OwnProduct[] = [];
  for (const r of owned) {
    const v = Number(r.user_value);
    if (!Number.isFinite(v) || v <= 0) {
      return { ok: false, status: 400, message: "Öneri almak için en az bir ürün seçmelisin." };
    }
    const prefs = wantedPrefsFromRow(r as Record<string, unknown>);
    selectedProducts.push({
      id: String(r.id),
      category: String(r.category ?? "Genel"),
      location: String(r.location ?? ""),
      user_value: v,
      wanted_categories: prefs.wanted_categories,
      wanted_keywords: prefs.wanted_keywords,
    });
  }

  const totalValue = selectedProducts.reduce((s, p) => s + p.user_value, 0);
  const band = VALUE_BAND_PCT / 100;
  const minValue = totalValue * (1 - band);
  const maxValue = totalValue * (1 + band);

  const { data: candidateRows, error: candErr } = await supabase
    .from("products")
    .select(CANDIDATE_SELECT)
    .eq("status", "available")
    .neq("owner_id", userId)
    .gte("user_value", minValue)
    .lte("user_value", maxValue)
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES_FETCH);

  if (candErr) {
    return { ok: false, status: 500, message: "Öneriler yüklenemedi." };
  }

  const ownerIds = [
    ...new Set(
      (candidateRows ?? []).map((r) => String((r as { owner_id: string }).owner_id))
    ),
  ];

  const trustByOwner = new Map<string, number | null>();
  if (ownerIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, trust_score")
      .in("id", ownerIds);

    for (const p of profileRows ?? []) {
      const row = p as { id: string; trust_score: number | null };
      trustByOwner.set(
        String(row.id),
        row.trust_score == null ? null : Number(row.trust_score)
      );
    }
  }

  const candidates: CandidateProductRow[] = (candidateRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const ownerId = String(r.owner_id);
    const pub = sanitizePublicProduct(r);
    return {
      id: pub.id,
      owner_id: ownerId,
      title: pub.title,
      description: pub.description,
      category: pub.category,
      condition: pub.condition,
      image_url: pub.image_url,
      location: pub.location,
      status: pub.status,
      ai_value_status: pub.ai_value_status,
      ai_badge_label: pub.ai_badge_label,
      ai_badge_color: pub.ai_badge_color,
      created_at: pub.created_at,
      user_value: Number(r.user_value),
      lat: pub.lat,
      lng: pub.lng,
      owner_trust_score: trustByOwner.get(ownerId) ?? null,
    };
  });

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("wanted_categories, wanted_keywords, location, latitude, longitude")
    .eq("id", userId)
    .maybeSingle();

  const profileWanted = profileRow
    ? wantedPrefsFromRow(profileRow as Record<string, unknown>)
    : { wanted_categories: [], wanted_keywords: [] };

  const profileRec = profileRow as {
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;

  const ranked = rankRecommendations({
    selectedProducts,
    candidateProducts: candidates,
    currentUserLocation,
    currentUserLat: profileRec?.latitude ?? null,
    currentUserLng: profileRec?.longitude ?? null,
    profileWanted,
  });

  return {
    ok: true,
    selected_count: selectedProducts.length,
    recommendations: ranked.slice(0, limit),
  };
}
