import { mapNotificationRow } from "@/lib/server/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Notification,
  NotificationListItem,
  NotificationResponse,
} from "@/lib/types/notification";

const DEFAULT_LIMIT = 50;

export function toNotificationListItem(n: Notification): NotificationListItem {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    read_at: n.read_at,
    created_at: n.created_at,
  };
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.warn("[notifications] unread count", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function loadUserNotifications(
  userId: string,
  limit = DEFAULT_LIMIT
): Promise<NotificationResponse> {
  const supabase = await createServerSupabaseClient();
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.warn("[notifications] list", error.message);
    return { notifications: [], unread_count: 0 };
  }

  const rows = (data ?? []).map((row) =>
    mapNotificationRow(row as Record<string, unknown>)
  );
  const unread_count = await fetchUnreadNotificationCount(userId);
  return {
    notifications: rows.map(toNotificationListItem),
    unread_count,
  };
}
