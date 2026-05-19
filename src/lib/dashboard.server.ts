import { fetchOwnAvailableProductsForBundle } from "@/lib/explore-products";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProduct } from "@/lib/types/product";

export type DashboardData = {
  ownProducts: PublicProduct[];
  latestProducts: PublicProduct[];
  pendingIncoming: number;
  pendingOutgoing: number;
};

export async function loadDashboardData(userId: string): Promise<DashboardData> {
  const ownProducts = await fetchOwnAvailableProductsForBundle(userId);
  const latestProducts = ownProducts.slice(0, 5);

  let pendingIncoming = 0;
  let pendingOutgoing = 0;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createServerSupabaseClient();
      const [inRes, outRes] = await Promise.all([
        supabase
          .from("swap_offers")
          .select("id", { count: "exact", head: true })
          .eq("to_user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("swap_offers")
          .select("id", { count: "exact", head: true })
          .eq("from_user_id", userId)
          .eq("status", "pending"),
      ]);
      pendingIncoming = inRes.count ?? 0;
      pendingOutgoing = outRes.count ?? 0;
    } catch {
      // mock / offline
    }
  }

  return {
    ownProducts,
    latestProducts,
    pendingIncoming,
    pendingOutgoing,
  };
}
