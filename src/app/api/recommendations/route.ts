import { NextResponse } from "next/server";

import { computeRecommendations } from "@/lib/recommendations.server";
import { fetchPublicProfile } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { selected_product_ids?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const selected_product_ids = Array.isArray(body.selected_product_ids)
    ? body.selected_product_ids.filter((x): x is string => typeof x === "string")
    : [];
  const limit =
    typeof body.limit === "number"
      ? body.limit
      : typeof body.limit === "string"
        ? Number(body.limit)
        : 20;

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

  const result = await computeRecommendations(
    supabase,
    user.id,
    selected_product_ids,
    limit,
    profile.location
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    selected_count: result.selected_count,
    recommendations: result.recommendations,
  });
}
