import { EXPLORE_PUBLIC_COLUMNS } from "@/lib/explore-constants";
import { sanitizePublicProduct } from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductFavorite } from "@/lib/types/favorite";
import type { PublicProduct } from "@/lib/types/product";

export async function fetchFavoriteProductIds(userId: string): Promise<Set<string>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("product_favorites")
    .select("product_id")
    .eq("user_id", userId);

  if (error) {
    console.warn("[favorites] fetch ids", error.message);
    return new Set();
  }

  return new Set(
    (data ?? []).map((row) => String((row as { product_id: string }).product_id))
  );
}

export async function loadUserFavorites(userId: string): Promise<ProductFavorite[]> {
  const supabase = await createServerSupabaseClient();

  const { data: favRows, error: favErr } = await supabase
    .from("product_favorites")
    .select("id, product_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favErr) {
    console.warn("[favorites] list", favErr.message);
    return [];
  }

  if (!favRows?.length) return [];

  const productIds = favRows.map((r) => String((r as { product_id: string }).product_id));

  const { data: prodRows, error: prodErr } = await supabase
    .from("products")
    .select(EXPLORE_PUBLIC_COLUMNS)
    .in("id", productIds)
    .eq("status", "available");

  if (prodErr) {
    console.warn("[favorites] products", prodErr.message);
    return [];
  }

  const byId = new Map<string, PublicProduct>();
  for (const row of prodRows ?? []) {
    const p = sanitizePublicProduct(row as Record<string, unknown>);
    byId.set(p.id, p);
  }

  const out: ProductFavorite[] = [];
  for (const row of favRows) {
    const rec = row as { id: string; product_id: string; created_at: string };
    const product = byId.get(String(rec.product_id));
    if (!product) continue;
    out.push({
      id: String(rec.id),
      product,
      created_at: String(rec.created_at ?? new Date().toISOString()),
    });
  }

  return out;
}
