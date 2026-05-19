import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ product_id: string }> }
) {
  const { product_id: productId } = await params;
  const id = productId?.trim();
  if (!id) {
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

  const { error } = await supabase
    .from("product_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", id);

  if (error) {
    console.error("[DELETE /api/favorites]", error.message);
    return NextResponse.json({ error: "Kayıt kaldırılırken hata oluştu." }, { status: 500 });
  }

  return NextResponse.json({ success: true, saved: false });
}
