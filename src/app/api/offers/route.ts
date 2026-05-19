import { NextResponse } from "next/server";

import { createNotification } from "@/lib/server/notifications";
import { evaluateOfferSafety } from "@/lib/server/offer-safety.server";
import { validateOfferProducts } from "@/lib/swap-offers.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    requested_product_id?: unknown;
    offered_product_ids?: unknown;
    message?: unknown;
  };
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
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

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

  const { requested, offered, value_match_score, match_label } = v.data;

  const safety = await evaluateOfferSafety(supabase, {
    requesterId: user.id,
    ownerId: requested.owner_id,
    requestedProductId: requested.id,
    offeredProductIds: offered.map((o) => o.id),
    matchLabel: match_label,
    offerStatus: "pending",
  });

  const { data: offerRow, error: insErr } = await supabase
    .from("swap_offers")
    .insert({
      from_user_id: user.id,
      to_user_id: requested.owner_id,
      requested_product_id: requested.id,
      status: "pending",
      message: message || null,
      value_match_score,
      match_label,
      safety_risk_level: safety.risk_level,
      safety_label: safety.label,
    })
    .select("id")
    .single();

  if (insErr || !offerRow?.id) {
    console.error("[POST /api/offers] insert offer", insErr?.message);
    return NextResponse.json(
      { error: "Teklif kaydedilemedi." },
      { status: 500 }
    );
  }

  const offerId = String(offerRow.id);

  const itemRows = offered.map((o) => ({
    offer_id: offerId,
    product_id: o.id,
  }));

  const { error: itemsErr } = await supabase.from("swap_offer_items").insert(itemRows);

  if (itemsErr) {
    console.error("[POST /api/offers] insert items", itemsErr.message);
    await supabase.from("swap_offers").delete().eq("id", offerId);
    return NextResponse.json(
      { error: "Teklif kalemleri kaydedilemedi." },
      { status: 500 }
    );
  }

  void createNotification({
    userId: requested.owner_id,
    type: "offer_received",
    title: "Yeni takas teklifi aldın",
    body: "Bir kullanıcı ürünün için takas teklifi gönderdi.",
    href: "/offers",
    relatedOfferId: offerId,
    relatedProductId: requested.id,
  });

  return NextResponse.json({
    success: true,
    offer_id: offerId,
    match_label,
    safety: {
      risk_level: safety.risk_level,
      label: safety.label,
      color: safety.color,
    },
  });
}
