import { NextResponse } from "next/server";

import { fetchPublicProfile, toPublicProfile, toProfileView } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeWantedPrefs } from "@/lib/wanted";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  let body: { wanted_categories?: unknown; wanted_keywords?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const prefs = normalizeWantedPrefs({
    wanted_categories: Array.isArray(body.wanted_categories)
      ? body.wanted_categories.filter((x): x is string => typeof x === "string")
      : undefined,
    wanted_keywords: Array.isArray(body.wanted_keywords)
      ? body.wanted_keywords.filter((x): x is string => typeof x === "string")
      : undefined,
  });

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      wanted_categories: prefs.wanted_categories,
      wanted_keywords: prefs.wanted_keywords,
    })
    .eq("id", user.id)
    .select(
      "id, full_name, username, avatar_url, location, bio, trust_score, completed_swaps, rating_average, rating_count, created_at, wanted_categories, wanted_keywords"
    )
    .maybeSingle();

  if (error) {
    console.error("[PATCH /api/profile/wishlist]", error.message);
    return NextResponse.json({ error: "İstek listesi kaydedilemedi." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 });
  }

  const profile = toProfileView(toPublicProfile(data as Record<string, unknown>));
  return NextResponse.json({ success: true, profile });
}

export async function GET() {
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const profile = await fetchPublicProfile(user.id);
  return NextResponse.json({
    wanted_categories: profile.wanted_categories,
    wanted_keywords: profile.wanted_keywords,
  });
}
