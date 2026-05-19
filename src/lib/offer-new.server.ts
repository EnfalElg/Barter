import { EXPLORE_PUBLIC_COLUMNS, fetchOwnAvailableProductsForBundle } from "@/lib/explore-products";
import { sanitizePublicProduct } from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProduct } from "@/lib/types/product";
import type { WantedPrefs } from "@/lib/wanted";

export async function loadOfferNewPageData(
  requestedProductId: string,
  userId: string
): Promise<
  | {
      ok: true;
      requested: PublicProduct;
      mine: PublicProduct[];
      ownerWanted: WantedPrefs;
    }
  | { ok: false; reason: "not_found" | "own_product" }
> {
  const supabase = await createServerSupabaseClient();
  const { data: reqRow, error } = await supabase
    .from("products")
    .select(EXPLORE_PUBLIC_COLUMNS)
    .eq("id", requestedProductId)
    .eq("status", "available")
    .maybeSingle();

  if (error || !reqRow) {
    return { ok: false, reason: "not_found" };
  }

  const requested = sanitizePublicProduct(reqRow as Record<string, unknown>);
  if (requested.owner_id === userId) {
    return { ok: false, reason: "own_product" };
  }

  const mine = await fetchOwnAvailableProductsForBundle(userId);
  return {
    ok: true,
    requested,
    mine,
    ownerWanted: {
      wanted_categories: requested.wanted_categories,
      wanted_keywords: requested.wanted_keywords,
    },
  };
}
