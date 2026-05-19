import { calculateValueMatchScore, getMatchLabel } from "@/lib/product-value";
import type { SupabaseClient } from "@supabase/supabase-js";

const PRODUCT_VALUE_SELECT = "id, owner_id, status, user_value";

export type ValidatedOfferAnchor = {
  requested: {
    id: string;
    owner_id: string;
    user_value: number;
  };
  offered: { id: string; user_value: number }[];
  offeredTotal: number;
  value_match_score: number;
  match_label: string;
};

/**
 * Validates requested + offered products for preview or create.
 * Uses private user_value server-side only; never return raw values to clients.
 */
export async function validateOfferProducts(
  supabase: SupabaseClient,
  userId: string,
  requestedProductId: string,
  offeredProductIds: string[]
): Promise<
  | { ok: true; data: ValidatedOfferAnchor }
  | { ok: false; status: number; message: string }
> {
  const uniqueOffered = [...new Set(offeredProductIds.map((x) => String(x).trim()))].filter(
    Boolean
  );
  if (!requestedProductId?.trim()) {
    return { ok: false, status: 400, message: "Takas istenen ürün bulunamadı." };
  }
  if (uniqueOffered.length === 0) {
    return { ok: false, status: 400, message: "En az bir teklif ürünü seçmelisin." };
  }
  if (uniqueOffered.length > 10) {
    return { ok: false, status: 400, message: "En fazla 10 ürün teklif edebilirsin." };
  }

  const { data: reqRow, error: reqErr } = await supabase
    .from("products")
    .select(PRODUCT_VALUE_SELECT)
    .eq("id", requestedProductId)
    .eq("status", "available")
    .maybeSingle();

  if (reqErr || !reqRow) {
    return { ok: false, status: 404, message: "Takas istenen ürün bulunamadı." };
  }

  const req = reqRow as {
    id: string;
    owner_id: string;
    status: string;
    user_value: number | null;
  };

  if (String(req.owner_id) === userId) {
    return { ok: false, status: 400, message: "Takas istenen ürün bulunamadı." };
  }

  const reqVal = Number(req.user_value);
  if (!Number.isFinite(reqVal) || reqVal <= 0) {
    return { ok: false, status: 404, message: "Takas istenen ürün bulunamadı." };
  }

  const { data: offRows, error: offErr } = await supabase
    .from("products")
    .select(PRODUCT_VALUE_SELECT)
    .in("id", uniqueOffered)
    .eq("owner_id", userId)
    .eq("status", "available");

  if (offErr) {
    return { ok: false, status: 500, message: "Ürünler yüklenemedi." };
  }

  const rows = (offRows ?? []) as {
    id: string;
    owner_id: string;
    status: string;
    user_value: number | null;
  }[];

  if (rows.length !== uniqueOffered.length) {
    return { ok: false, status: 403, message: "Sadece kendi ürünlerini teklif edebilirsin." };
  }

  const offered = rows.map((r) => ({
    id: String(r.id),
    user_value: Number(r.user_value),
  }));

  for (const o of offered) {
    if (!Number.isFinite(o.user_value) || o.user_value <= 0) {
      return { ok: false, status: 403, message: "Sadece kendi ürünlerini teklif edebilirsin." };
    }
  }

  const offeredTotal = offered.reduce((s, o) => s + o.user_value, 0);
  const value_match_score = calculateValueMatchScore(offeredTotal, reqVal);
  const match_label = getMatchLabel(value_match_score);

  return {
    ok: true,
    data: {
      requested: { id: String(req.id), owner_id: String(req.owner_id), user_value: reqVal },
      offered,
      offeredTotal,
      value_match_score,
      match_label,
    },
  };
}
