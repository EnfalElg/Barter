import { computeProductMatches } from "@/lib/product-matches";
import { sanitizeOfferPickRow, sanitizePublicProduct } from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MatchProduct, OfferPickRow, PublicProduct } from "@/lib/types/product";

export type OfferPageData =
  | { ok: true; target: PublicProduct; picks: OfferPickRow[] }
  | { ok: false; reason: "auth" | "not_found" };

export async function loadOfferPageData(targetId: string): Promise<OfferPageData> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "auth" };
  }

  const { data: targetRows, error: tErr } = await supabase.rpc(
    "get_public_product_card",
    { pid: targetId }
  );
  if (tErr || !targetRows?.length) {
    return { ok: false, reason: "not_found" };
  }

  const target = sanitizePublicProduct(targetRows[0] as Record<string, unknown>);

  const { data: pickRows, error: pErr } = await supabase.rpc("offer_match_scores", {
    p_target_id: targetId,
  });

  if (pErr) {
    return { ok: true, target, picks: [] };
  }

  const picks = (pickRows as Record<string, unknown>[]).map((r) =>
    sanitizeOfferPickRow(r)
  );
  return { ok: true, target, picks };
}

export type MatchesPageData =
  | { ok: true; matches: MatchProduct[]; range: number }
  | {
      ok: false;
      reason: "auth" | "forbidden" | "not_found" | "bad_request" | "error";
      message?: string;
    };

export async function loadMatchesPageData(
  productId: string,
  rangePct: number
): Promise<MatchesPageData> {
  const supabase = await createServerSupabaseClient();
  const result = await computeProductMatches(supabase, productId, rangePct);
  if (result.ok) {
    return { ok: true, matches: result.matches, range: result.range };
  }
  if (result.error === "unauthorized") return { ok: false, reason: "auth" };
  if (result.error === "forbidden") return { ok: false, reason: "forbidden" };
  if (result.error === "not_found") return { ok: false, reason: "not_found" };
  if (result.error === "bad_request") {
    return {
      ok: false,
      reason: "bad_request",
      message: result.message ?? "Bu ürün için değer bilgisi bulunamadı.",
    };
  }
  return { ok: false, reason: "error", message: result.message };
}
