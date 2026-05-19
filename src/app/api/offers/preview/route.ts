import { NextResponse } from "next/server";

import { evaluateOfferSafetyPublic } from "@/lib/server/offer-safety.server";
import { validateOfferProducts } from "@/lib/swap-offers.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { requested_product_id?: unknown; offered_product_ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const requested_product_id =
    typeof body.requested_product_id === "string" ? body.requested_product_id.trim() : "";
  const offered_product_ids = Array.isArray(body.offered_product_ids)
    ? body.offered_product_ids.filter((x): x is string => typeof x === "string")
    : [];

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

  const v = await validateOfferProducts(
    supabase,
    user.id,
    requested_product_id,
    offered_product_ids
  );
  if (!v.ok) {
    return NextResponse.json({ error: v.message }, { status: v.status });
  }

  const safety = await evaluateOfferSafetyPublic(supabase, {
    requesterId: user.id,
    ownerId: v.data.requested.owner_id,
    requestedProductId: requested_product_id,
    offeredProductIds: offered_product_ids,
    matchLabel: v.data.match_label,
  });

  return NextResponse.json({
    match_label: v.data.match_label,
    safety,
  });
}
