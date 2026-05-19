import { MOCK_PRODUCT_MATCH_SOURCES } from "@/data/mock-products";
import {
  sanitizePublicProduct,
  stripPrivateMatchSource,
} from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProduct } from "@/lib/types/product";

export async function fetchPublicProductListing(): Promise<PublicProduct[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return MOCK_PRODUCT_MATCH_SOURCES.map((p) => stripPrivateMatchSource(p));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("list_public_products_safe");
    if (error) {
      return MOCK_PRODUCT_MATCH_SOURCES.map((p) => stripPrivateMatchSource(p));
    }

    if (!data?.length) {
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) =>
      sanitizePublicProduct(row)
    );
  } catch {
    return MOCK_PRODUCT_MATCH_SOURCES.map((p) => stripPrivateMatchSource(p));
  }
}
