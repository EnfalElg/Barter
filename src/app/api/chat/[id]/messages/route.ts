import { NextResponse } from "next/server";

import { sendChatMessage } from "@/lib/chat.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await ctx.params;
  if (!threadId?.trim()) {
    return NextResponse.json({ error: "Eksik sohbet kimliği." }, { status: 400 });
  }

  let body: { body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body : "";

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

  const result = await sendChatMessage(threadId, user.id, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    message: {
      id: result.message.id,
      thread_id: result.message.thread_id,
      sender_id: result.message.sender_id,
      body: result.message.body,
      created_at: result.message.created_at,
    },
  });
}
