import type { SupabaseClient } from "@supabase/supabase-js";

import { parseProductCoords } from "@/lib/product-value";
import { calculateValueMatchScore } from "@/lib/product-value";
import type { MatchProduct, ProductStatus } from "@/lib/types/product";

const MATCH_ROW_SELECT =
  "id, owner_id, title, description, category, condition, image_url, location, status, ai_value_status, ai_badge_label, ai_badge_color, created_at, user_value, lat, lng, city";

type MatchRow = {
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
  city?: string | null;
};

function toMatchProduct(
  row: MatchRow,
  anchorValue: number,
  score: number
): MatchProduct {
  const coords = parseProductCoords(row as Record<string, unknown>);
  const desc = row.description;
  const preview =
    desc == null || desc === ""
      ? null
      : desc.length > 280
        ? `${desc.slice(0, 277)}…`
        : desc;

  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    description: preview,
    description_preview: preview,
    category: String(row.category ?? ""),
    condition: String(row.condition ?? ""),
    image_url: row.image_url ?? null,
    location: String(row.location ?? ""),
    status: (String(row.status ?? "available") as ProductStatus) || "available",
    ai_value_status: (row.ai_value_status ?? "unknown") as MatchProduct["ai_value_status"],
    ai_badge_label: row.ai_badge_label ?? null,
    ai_badge_color: (row.ai_badge_color ?? "gray") as MatchProduct["ai_badge_color"],
    value_match_score: score,
    created_at: row.created_at != null ? String(row.created_at) : new Date().toISOString(),
    lat: coords.lat,
    lng: coords.lng,
    city: row.city != null ? String(row.city) : null,
  };
}

export type ComputeMatchesResult =
  | {
      ok: true;
      selected_product_id: string;
      range: number;
      matches: MatchProduct[];
    }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "bad_request"
        | "query_error";
      message?: string;
    };

/**
 * Denk takas eşleşmesi — RPC kullanmaz. Önce sahibi doğrular, sonra ±% bandında
 * başkalarının user_value alanını sunucuda okur ve yanıtta asla döndürmez.
 */
export async function computeProductMatches(
  supabase: SupabaseClient,
  productId: string,
  rangePctInput: number
): Promise<ComputeMatchesResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  let range = Number.isFinite(rangePctInput) ? rangePctInput : 10;
  if (range < 1) range = 1;
  if (range > 50) range = 50;

  const { data: anchor, error: anchorErr } = await supabase
    .from("products")
    .select("id, owner_id, user_value, status")
    .eq("id", productId)
    .maybeSingle();

  if (anchorErr || !anchor) {
    return { ok: false, error: "not_found" };
  }

  const anchorStatus = String(anchor.status ?? "available").toLowerCase();
  if (anchorStatus === "deleted" || anchorStatus !== "available") {
    return { ok: false, error: "not_found" };
  }

  if (String(anchor.owner_id) !== user.id) {
    return { ok: false, error: "forbidden" };
  }

  const myValue = Number(anchor.user_value);
  if (!Number.isFinite(myValue) || myValue <= 0) {
    return {
      ok: false,
      error: "bad_request",
      message: "Bu ürün için değer bilgisi bulunamadı.",
    };
  }

  const minValue = myValue * (1 - range / 100);
  const maxValue = myValue * (1 + range / 100);

  const { data: rows, error: qErr } = await supabase
    .from("products")
    .select(MATCH_ROW_SELECT)
    .eq("status", "available")
    .neq("owner_id", user.id)
    .gte("user_value", minValue)
    .lte("user_value", maxValue)
    .order("created_at", { ascending: false });

  if (qErr) {
    return {
      ok: false,
      error: "query_error",
      message: qErr.message,
    };
  }

  const list = (rows ?? []) as unknown as MatchRow[];
  const withScores = list.map((row) => {
    const other = Number(row.user_value);
    const score = calculateValueMatchScore(myValue, other);
    return { row, score };
  });

  withScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime()
    );
  });

  const matches = withScores.map(({ row, score }) =>
    toMatchProduct(row, myValue, score)
  );

  return {
    ok: true,
    selected_product_id: productId,
    range,
    matches,
  };
}
