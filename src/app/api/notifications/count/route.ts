import { NextResponse } from "next/server";

import { fetchUnreadNotificationCount } from "@/lib/notifications.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return NextResponse.json({ unread_count: 0 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ unread_count: 0 });
  }

  const unread_count = await fetchUnreadNotificationCount(user.id);
  return NextResponse.json({ unread_count });
}
