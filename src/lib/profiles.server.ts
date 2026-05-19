import { EXPLORE_PUBLIC_COLUMNS } from "@/lib/explore-constants";
import { sanitizePublicProduct } from "@/lib/product-value";
import { wantedPrefsFromRow } from "@/lib/wanted";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProfile, PublicProfileView, PublicRatingView } from "@/lib/types/profile";
import type { PublicProduct } from "@/lib/types/product";

export function profileDisplayName(p: PublicProfile): string {
  const name = p.full_name?.trim();
  if (name) return name;
  const un = p.username?.trim();
  if (un) return un.startsWith("@") ? un : `@${un}`;
  return "Kullanıcı";
}

export function profileInitials(displayName: string): string {
  const parts = displayName.replace(/^@/, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "K").toUpperCase();
}

export function toPublicProfile(row: Record<string, unknown>): PublicProfile {
  return {
    id: String(row.id),
    full_name: row.full_name == null ? null : String(row.full_name),
    username: row.username == null ? null : String(row.username),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    location: row.location == null ? null : String(row.location),
    bio: row.bio == null ? null : String(row.bio),
    trust_score: Math.round(Number(row.trust_score ?? 50)),
    completed_swaps: Math.round(Number(row.completed_swaps ?? 0)),
    rating_average: Number(row.rating_average ?? 0),
    rating_count: Math.round(Number(row.rating_count ?? 0)),
    created_at: row.created_at != null ? String(row.created_at) : new Date().toISOString(),
    ...wantedPrefsFromRow(row),
  };
}

export function toProfileView(p: PublicProfile): PublicProfileView {
  const display_name = profileDisplayName(p);
  return {
    ...p,
    display_name,
    initials: profileInitials(display_name),
  };
}

export function fallbackProfileView(userId: string): PublicProfileView {
  return toProfileView({
    id: userId,
    full_name: null,
    username: null,
    avatar_url: null,
    location: null,
    bio: null,
    trust_score: 50,
    completed_swaps: 0,
    rating_average: 0,
    rating_count: 0,
    created_at: new Date().toISOString(),
    wanted_categories: [],
    wanted_keywords: [],
  });
}

const PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, location, bio, trust_score, completed_swaps, rating_average, rating_count, created_at, wanted_categories, wanted_keywords";

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Server-only: profile text location + optional coords (never sent to public API). */
export async function fetchProfileLocationContext(userId: string): Promise<{
  location: string | null;
  lat: number | null;
  lng: number | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select("location, latitude, longitude")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return { location: null, lat: null, lng: null };
  }

  const row = data as Record<string, unknown>;
  return {
    location: row.location == null ? null : String(row.location).trim() || null,
    lat: parseCoord(row.latitude),
    lng: parseCoord(row.longitude),
  };
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfileView> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return toProfileView(toPublicProfile(data as Record<string, unknown>));
  }

  return fallbackProfileView(userId);
}

export async function fetchRecentRatings(
  userId: string,
  limit = 5
): Promise<PublicRatingView[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("swap_ratings")
    .select("id, score, comment, created_at")
    .eq("rated_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[profiles] ratings", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      score: Math.round(Number(row.score)),
      comment: row.comment == null ? null : String(row.comment),
      created_at: String(row.created_at ?? ""),
    };
  });
}

export async function fetchUserAvailableProducts(userId: string): Promise<PublicProduct[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(EXPLORE_PUBLIC_COLUMNS)
    .eq("owner_id", userId)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[profiles] products", error.message);
    return [];
  }

  return (data ?? []).map((r) => sanitizePublicProduct(r as Record<string, unknown>));
}

function usernameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  if (!local) return null;
  return local.slice(0, 32);
}

export async function ensureOwnProfileRow(
  userId: string,
  hints?: { full_name?: string; username?: string; location?: string }
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("profiles").insert({
    id: userId,
    full_name: hints?.full_name?.trim() || null,
    username: hints?.username?.trim() || null,
    location: hints?.location?.trim() || null,
    trust_score: 50,
    completed_swaps: 0,
    rating_average: 0,
    rating_count: 0,
  });
}

export async function ensureOwnProfileFromAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<void> {
  const meta = user.user_metadata ?? {};
  const fullName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : undefined;

  await ensureOwnProfileRow(user.id, {
    full_name: fullName,
    username: usernameFromEmail(user.email ?? undefined) ?? undefined,
  });
}
