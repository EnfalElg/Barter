import "server-only";

import { calculateTrustScore } from "@/lib/trust-score";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function accountAgeDays(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export type RecalculateTrustResult = {
  trust_score: number;
  completed_swaps: number;
  rating_average: number;
  rating_count: number;
};

/**
 * Recomputes trust from public signals and persists via SECURITY DEFINER RPC.
 * Never reads or writes private product values.
 */
export async function recalculateTrustScore(
  userId: string
): Promise<RecalculateTrustResult | null> {
  if (!userId?.trim()) return null;

  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, location, bio, created_at, trust_score, completed_swaps, rating_average, rating_count"
    )
    .eq("id", userId)
    .maybeSingle();

  const { count: completedSwaps } = await supabase
    .from("swap_offers")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

  const { data: ratingRows } = await supabase
    .from("swap_ratings")
    .select("score")
    .eq("rated_user_id", userId);

  const scores = (ratingRows ?? [])
    .map((r) => Number((r as { score: number }).score))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);

  const ratingCount = scores.length;
  const ratingAverage =
    ratingCount > 0 ? scores.reduce((a, b) => a + b, 0) / ratingCount : 0;

  const { count: activeProductCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "available");

  const { count: suspiciousProductCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .in("ai_value_status", ["very_high", "very_low", "unknown"]);

  const row = profile as Record<string, unknown> | null;

  const trustScore = calculateTrustScore({
    hasFullName: Boolean(row?.full_name && String(row.full_name).trim()),
    hasAvatar: Boolean(row?.avatar_url && String(row.avatar_url).trim()),
    hasLocation: Boolean(row?.location && String(row.location).trim()),
    hasBio: Boolean(row?.bio && String(row.bio).trim()),
    completedSwaps: completedSwaps ?? 0,
    ratingAverage,
    ratingCount,
    accountAgeDays: accountAgeDays(
      row?.created_at != null ? String(row.created_at) : undefined
    ),
    activeProductCount: activeProductCount ?? 0,
    suspiciousProductCount: suspiciousProductCount ?? 0,
  });

  const completed = completedSwaps ?? 0;

  const { error: rpcErr } = await supabase.rpc("apply_user_trust_stats", {
    p_user_id: userId,
    p_trust_score: trustScore,
    p_completed_swaps: completed,
    p_rating_average: ratingAverage,
    p_rating_count: ratingCount,
  });

  if (rpcErr) {
    console.warn("[recalculateTrustScore]", rpcErr.message);
    return null;
  }

  return {
    trust_score: trustScore,
    completed_swaps: completed,
    rating_average: ratingAverage,
    rating_count: ratingCount,
  };
}
