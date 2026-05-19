import { NextResponse } from "next/server";

import {
  findOrCreateChatThread,
  validateChatProduct,
} from "@/lib/chat.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { other_user_id?: unknown; product_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const other_user_id =
    typeof body.other_user_id === "string" ? body.other_user_id.trim() : "";
  const product_id =
    typeof body.product_id === "string" && body.product_id.trim()
      ? body.product_id.trim()
      : null;

  if (!other_user_id) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 400 });
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

  if (other_user_id === user.id) {
    return NextResponse.json({ error: "Kendinle sohbet başlatamazsın." }, { status: 400 });
  }

  if (product_id) {
    const v = await validateChatProduct(supabase, product_id, other_user_id);
    if (!v.ok) {
      return NextResponse.json({ error: v.message }, { status: 400 });
    }
  }

  const result = await findOrCreateChatThread(supabase, user.id, other_user_id, product_id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    thread_id: result.thread_id,
    redirect_url: `/chat/${result.thread_id}`,
  });
}
