import { NextResponse } from "next/server";

import { loadUserFavorites } from "@/lib/favorites.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const favorites = await loadUserFavorites(user.id);
  return NextResponse.json({ favorites });
}

export async function POST(req: Request) {
  let body: { product_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const productId =
    typeof body.product_id === "string" ? body.product_id.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "Ürün kimliği gerekli." }, { status: 400 });
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

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select(`id, owner_id, status`)
    .eq("id", productId)
    .maybeSingle();

  if (prodErr || !product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const row = product as { id: string; owner_id: string; status: string };
  if (row.status !== "available") {
    return NextResponse.json({ error: "Bu ürün kaydedilemez." }, { status: 400 });
  }
  if (row.owner_id === user.id) {
    return NextResponse.json({ error: "Kendi ürününü kaydedemezsin." }, { status: 400 });
  }

  const { error: insertErr } = await supabase.from("product_favorites").insert({
    user_id: user.id,
    product_id: productId,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ success: true, saved: true });
    }
    console.error("[POST /api/favorites]", insertErr.message);
    return NextResponse.json({ error: "Ürün kaydedilemedi." }, { status: 500 });
  }

  return NextResponse.json({ success: true, saved: true });
}
