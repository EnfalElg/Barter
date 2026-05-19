import { NextResponse } from "next/server";

import { toPublicProfile, toProfileView } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  let body: { location?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const location =
    typeof body.location === "string"
      ? body.location.trim().slice(0, 120) || null
      : body.location === null
        ? null
        : undefined;

  if (location === undefined) {
    return NextResponse.json({ error: "Konum gerekli." }, { status: 400 });
  }

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
    .update({ location })
    .eq("id", user.id)
    .select(
      "id, full_name, username, avatar_url, location, bio, trust_score, completed_swaps, rating_average, rating_count, created_at, wanted_categories, wanted_keywords"
    )
    .maybeSingle();

  if (error) {
    console.error("[PATCH /api/profile/location]", error.message);
    return NextResponse.json({ error: "Konum kaydedilemedi." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Profil bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    profile: toProfileView(toPublicProfile(data as Record<string, unknown>)),
  });
}
