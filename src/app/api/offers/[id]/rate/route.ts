import { NextResponse } from "next/server";

import { createNotification } from "@/lib/server/notifications";
import { recalculateTrustScore } from "@/lib/server/recalculate-trust-score";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offerId } = await ctx.params;
  if (!offerId?.trim()) {
    return NextResponse.json({ error: "Eksik teklif kimliği." }, { status: 400 });
  }

  let body: { score?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json(
      { error: "Puan 1 ile 5 arasında olmalı." },
      { status: 400 }
    );
  }

  const comment =
    typeof body.comment === "string" && body.comment.trim()
      ? body.comment.trim().slice(0, 2000)
      : null;

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

  const { data: offer, error: fetchErr } = await supabase
    .from("swap_offers")
    .select("id, status, from_user_id, to_user_id")
    .eq("id", offerId)
    .maybeSingle();

  if (fetchErr || !offer) {
    return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 404 });
  }

  if (String(offer.status) !== "completed") {
    return NextResponse.json(
      { error: "Sadece tamamlanan takaslar değerlendirilebilir." },
      { status: 400 }
    );
  }

  const fromId = String(offer.from_user_id);
  const toId = String(offer.to_user_id);
  const uid = user.id;

  if (uid !== fromId && uid !== toId) {
    return NextResponse.json(
      { error: "Bu takası değerlendirme yetkin yok." },
      { status: 403 }
    );
  }

  const ratedUserId = uid === fromId ? toId : fromId;
  if (ratedUserId === uid) {
    return NextResponse.json({ error: "Bu takası değerlendirme yetkin yok." }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("swap_ratings")
    .select("id")
    .eq("offer_id", offerId)
    .eq("rater_id", uid)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Bu takası zaten değerlendirdin." },
      { status: 409 }
    );
  }

  const { error: insErr } = await supabase.from("swap_ratings").insert({
    offer_id: offerId,
    rater_id: uid,
    rated_user_id: ratedUserId,
    score,
    comment,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "Bu takası zaten değerlendirdin." },
        { status: 409 }
      );
    }
    console.error("[POST /api/offers/rate]", insErr.message);
    return NextResponse.json({ error: "Değerlendirme kaydedilemedi." }, { status: 500 });
  }

  await recalculateTrustScore(ratedUserId);

  void createNotification({
    userId: ratedUserId,
    type: "rating_received",
    title: "Yeni değerlendirme aldın",
    body: "Tamamlanan bir takastan değerlendirme aldın.",
    href: `/users/${ratedUserId}`,
    relatedOfferId: offerId,
  });

  return NextResponse.json({ success: true });
}
