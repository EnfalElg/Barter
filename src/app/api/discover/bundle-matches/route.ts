import { NextResponse } from "next/server";

import { computeBundleMatches } from "@/lib/bundle-matches.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    product_ids?: unknown;
    range?: unknown;
    category?: string;
    location?: string;
    condition?: string;
    ai_value_status?: string;
    search?: string;
    prioritize_wish?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const product_ids = Array.isArray(body.product_ids)
    ? body.product_ids.filter((x): x is string => typeof x === "string")
    : [];

  const range =
    typeof body.range === "number"
      ? body.range
      : typeof body.range === "string"
        ? Number(body.range)
        : 10;

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

  const prioritize_wish =
    body.prioritize_wish === true ||
    body.prioritize_wish === "true" ||
    body.prioritize_wish === 1 ||
    body.prioritize_wish === "1";

  const result = await computeBundleMatches(supabase, user.id, product_ids, range, {
    category: body.category,
    location: body.location,
    condition: body.condition,
    ai_value_status: body.ai_value_status,
    search: body.search,
    prioritize_wish,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const safeMatches = result.matches.map(({ value_match_score: _score, ...m }) => m);

  return NextResponse.json({
    selected_product_ids: result.selected_product_ids,
    selected_count: result.selected_count,
    range: result.range,
    matches: safeMatches,
  });
}
