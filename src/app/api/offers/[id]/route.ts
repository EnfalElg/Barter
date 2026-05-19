import { NextResponse } from "next/server";

import { createNotification } from "@/lib/server/notifications";
import { recalculateTrustScore } from "@/lib/server/recalculate-trust-score";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OfferStatus } from "@/lib/types/swap-offer";

export const runtime = "nodejs";

type Action = "accept" | "reject" | "cancel" | "complete";

const ERR_FORBIDDEN = "Bu işlem için yetkin yok.";
const ERR_INVALID_STATUS = "Teklif bu işlem için uygun durumda değil.";
const ERR_NOT_FOUND = "Teklif bulunamadı.";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: offerId } = await ctx.params;
  if (!offerId?.trim()) {
    return NextResponse.json({ error: "Eksik teklif kimliği." }, { status: 400 });
  }

  let body: { action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const action = body.action as Action;
  if (
    action !== "accept" &&
    action !== "reject" &&
    action !== "cancel" &&
    action !== "complete"
  ) {
    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
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

  const { data: row, error: fetchErr } = await supabase
    .from("swap_offers")
    .select("id, status, from_user_id, to_user_id, requested_product_id")
    .eq("id", offerId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: ERR_NOT_FOUND }, { status: 404 });
  }

  const status = String(row.status);
  const fromId = String(row.from_user_id);
  const toId = String(row.to_user_id);
  const uid = user.id;

  if (action === "complete") {
    if (status !== "accepted") {
      return NextResponse.json({ error: ERR_INVALID_STATUS }, { status: 400 });
    }
    if (uid !== fromId && uid !== toId) {
      return NextResponse.json({ error: ERR_FORBIDDEN }, { status: 403 });
    }

    const { data: rpcData, error: rpcErr } = await supabase.rpc("complete_swap_offer", {
      p_offer_id: offerId,
    });

    if (rpcErr) {
      console.error("[PATCH /api/offers complete]", rpcErr.message);
      return NextResponse.json({ error: "Tamamlama başarısız." }, { status: 500 });
    }

    const result = rpcData as { ok?: boolean; error?: string; status?: string } | null;
    if (!result?.ok) {
      if (result?.error === "not_found") {
        return NextResponse.json({ error: ERR_NOT_FOUND }, { status: 404 });
      }
      if (result?.error === "forbidden") {
        return NextResponse.json({ error: ERR_FORBIDDEN }, { status: 403 });
      }
      return NextResponse.json({ error: ERR_INVALID_STATUS }, { status: 400 });
    }

    await Promise.all([
      recalculateTrustScore(fromId),
      recalculateTrustScore(toId),
    ]);

    const otherOnComplete = uid === fromId ? toId : fromId;
    void createNotification({
      userId: otherOnComplete,
      type: "offer_completed",
      title: "Takas tamamlandı",
      body: "Takas tamamlandı. Deneyimini değerlendirebilirsin.",
      href: "/offers",
      relatedOfferId: offerId,
      relatedProductId: String(row.requested_product_id ?? "") || undefined,
    });

    return NextResponse.json({ success: true, status: "completed" satisfies OfferStatus });
  }

  if (status !== "pending") {
    return NextResponse.json({ error: ERR_INVALID_STATUS }, { status: 400 });
  }

  const nextStatus: OfferStatus =
    action === "accept"
      ? "accepted"
      : action === "reject"
        ? "rejected"
        : "cancelled";

  if (action === "cancel") {
    if (uid !== fromId) {
      return NextResponse.json({ error: ERR_FORBIDDEN }, { status: 403 });
    }
  } else if (uid !== toId) {
    return NextResponse.json({ error: ERR_FORBIDDEN }, { status: 403 });
  }

  const { data: updated, error: upErr } = await supabase
    .from("swap_offers")
    .update({ status: nextStatus })
    .eq("id", offerId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (upErr) {
    console.error("[PATCH /api/offers]", upErr.message);
    return NextResponse.json({ error: "Güncelleme başarısız." }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: ERR_INVALID_STATUS }, { status: 400 });
  }

  const productId = row.requested_product_id
    ? String(row.requested_product_id)
    : undefined;

  if (action === "accept") {
    void createNotification({
      userId: fromId,
      type: "offer_accepted",
      title: "Takas teklifin kabul edildi",
      body: "Teklifin kabul edildi. Sohbetten detayları netleştirebilirsin.",
      href: "/offers",
      relatedOfferId: offerId,
      relatedProductId: productId,
    });
  } else if (action === "reject") {
    void createNotification({
      userId: fromId,
      type: "offer_rejected",
      title: "Takas teklifin reddedildi",
      body: "Teklifin reddedildi.",
      href: "/offers",
      relatedOfferId: offerId,
      relatedProductId: productId,
    });
  } else if (action === "cancel") {
    void createNotification({
      userId: toId,
      type: "offer_cancelled",
      title: "Takas teklifi iptal edildi",
      body: "Gelen bir takas teklifi iptal edildi.",
      href: "/offers",
      relatedOfferId: offerId,
      relatedProductId: productId,
    });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
