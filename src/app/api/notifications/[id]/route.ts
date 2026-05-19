import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type MarkAction = "mark_read" | "mark_unread";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Eksik bildirim kimliği." }, { status: 400 });
  }

  let body: { action?: unknown; read?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  let action: MarkAction | null = null;
  if (body.action === "mark_read" || body.action === "mark_unread") {
    action = body.action;
  } else if (body.read === true) {
    action = "mark_read";
  } else if (body.read === false) {
    action = "mark_unread";
  }

  if (!action) {
    return NextResponse.json(
      { error: "action: mark_read veya mark_unread gerekli." },
      { status: 400 }
    );
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
    .from("notifications")
    .update({
      read_at: action === "mark_read" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[PATCH /api/notifications/id]", error.message);
    return NextResponse.json({ error: "Güncellenemedi." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Eksik bildirim kimliği." }, { status: 400 });
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
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/notifications/id]", error.message);
    return NextResponse.json({ error: "Silinemedi." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
