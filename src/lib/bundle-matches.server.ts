import { calculateValueMatchScore, getMatchLabel, sanitizePublicProduct } from "@/lib/product-value";
import type { BundleExploreMatch } from "@/lib/types/swap-offer";
import {
  bundleWishLabels,
  collectWantedFromProducts,
  mergeWantedPrefs,
  wantedPrefsFromRow,
} from "@/lib/wanted";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BundleMatchFilters = {
  category?: string;
  location?: string;
  condition?: string;
  ai_value_status?: string;
  search?: string;
  prioritize_wish?: boolean;
};

const MATCH_SELECT =
  "id, owner_id, title, description, category, condition, image_url, location, status, ai_value_status, ai_badge_label, ai_badge_color, created_at, user_value, lat, lng, city, tags, quantity, unit, wanted_categories, wanted_keywords";

export async function computeBundleMatches(
  supabase: SupabaseClient,
  userId: string,
  productIds: string[],
  rangePctInput: number,
  filters: BundleMatchFilters
): Promise<
  | { ok: true; selected_product_ids: string[]; selected_count: number; range: number; matches: BundleExploreMatch[] }
  | { ok: false; status: number; message: string }
> {
  const ids = [...new Set(productIds.map((x) => String(x).trim()))].filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, status: 400, message: "Seçilen ürünler bulunamadı." };
  }
  if (ids.length > 10) {
    return { ok: false, status: 400, message: "En fazla 10 ürün seçebilirsin." };
  }

  let range = Number.isFinite(rangePctInput) ? rangePctInput : 10;
  if (range < 1) range = 1;
  if (range > 50) range = 50;

  const { data: ownRows, error: ownErr } = await supabase
    .from("products")
    .select("id, user_value, owner_id, status, wanted_categories, wanted_keywords")
    .in("id", ids)
    .eq("owner_id", userId)
    .eq("status", "available");

  if (ownErr) {
    return { ok: false, status: 500, message: "Ürünler yüklenemedi." };
  }

  const owned = (ownRows ?? []) as {
    id: string;
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
      message: "Sadece kendi ürünlerinle denk takas arayabilirsin.",
    };
  }

  let totalValue = 0;
  for (const r of owned) {
    const v = Number(r.user_value);
    if (!Number.isFinite(v) || v <= 0) {
      return { ok: false, status: 400, message: "Seçilen ürünler bulunamadı." };
    }
    totalValue += v;
  }

  const minValue = totalValue * (1 - range / 100);
  const maxValue = totalValue * (1 + range / 100);

  let q = supabase
    .from("products")
    .select(MATCH_SELECT)
    .eq("status", "available")
    .neq("owner_id", userId)
    .gte("user_value", minValue)
    .lte("user_value", maxValue)
    .order("created_at", { ascending: false });

  if (filters.category?.trim()) {
    q = q.eq("category", filters.category.trim());
  }
  if (filters.location?.trim()) {
    q = q.eq("location", filters.location.trim());
  }
  if (filters.condition?.trim()) {
    q = q.eq("condition", filters.condition.trim());
  }
  if (filters.ai_value_status?.trim()) {
    q = q.eq("ai_value_status", filters.ai_value_status.trim());
  }
  if (filters.search?.trim()) {
    const raw = filters.search.trim().replace(/%/g, "\\%");
    q = q.ilike("title", `%${raw}%`);
  }

  const { data: rows, error: qErr } = await q;
  if (qErr) {
    return { ok: false, status: 500, message: "Eşleşmeler yüklenemedi." };
  }

  const productWanted = collectWantedFromProducts(
    owned.map((r) => wantedPrefsFromRow(r as Record<string, unknown>))
  );

  let profileWanted = { wanted_categories: [] as string[], wanted_keywords: [] as string[] };
  if (
    productWanted.wanted_categories.length === 0 &&
    productWanted.wanted_keywords.length === 0
  ) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("wanted_categories, wanted_keywords")
      .eq("id", userId)
      .maybeSingle();
    if (profileRow) {
      profileWanted = wantedPrefsFromRow(profileRow as Record<string, unknown>);
    }
  }

  const aggregatedWanted = mergeWantedPrefs(productWanted, profileWanted);

  const list = (rows ?? []) as Record<string, unknown>[];
  const matches: BundleExploreMatch[] = list.map((row) => {
    const other = Number(row.user_value);
    const score = calculateValueMatchScore(totalValue, other);
    const pub = sanitizePublicProduct(row);
    const wish = bundleWishLabels(
      {
        category: pub.category,
        title: pub.title,
        description: pub.description,
      },
      aggregatedWanted
    );
    return {
      id: pub.id,
      owner_id: pub.owner_id,
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
      value_match_score: score,
      match_label: getMatchLabel(score),
      wish_category_label: wish.wish_category_label,
      wish_keyword_label: wish.wish_keyword_label,
    };
  });

  matches.sort((a, b) => {
    if (filters.prioritize_wish) {
      const aWish = a.wish_category_label || a.wish_keyword_label ? 1 : 0;
      const bWish = b.wish_category_label || b.wish_keyword_label ? 1 : 0;
      if (bWish !== aWish) return bWish - aWish;
    }
    if (b.value_match_score !== a.value_match_score) {
      return b.value_match_score - a.value_match_score;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    ok: true,
    selected_product_ids: owned.map((r) => String(r.id)),
    selected_count: owned.length,
    range,
    matches,
  };
}
