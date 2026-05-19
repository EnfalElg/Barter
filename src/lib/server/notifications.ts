import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { NotificationType } from "@/lib/types/notification";

export type { NotificationType };

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  relatedOfferId?: string;
  relatedProductId?: string;
  relatedThreadId?: string;
};

const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Inserts an in-app notification for a user. Never throws; logs on failure.
 * Requires SUPABASE_SERVICE_ROLE_KEY for cross-user delivery.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    console.warn(
      "[notifications] SUPABASE_SERVICE_ROLE_KEY missing — skipped:",
      input.type,
      input.userId
    );
    return;
  }

  try {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    let dedupeQ = supabase
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("type", input.type)
      .gte("created_at", since)
      .limit(1);

    if (input.relatedOfferId) {
      dedupeQ = dedupeQ.eq("related_offer_id", input.relatedOfferId);
    } else if (input.relatedThreadId) {
      dedupeQ = dedupeQ.eq("related_thread_id", input.relatedThreadId);
    } else if (input.relatedProductId) {
      dedupeQ = dedupeQ.eq("related_product_id", input.relatedProductId);
    }

    const { data: recent } = await dedupeQ;
    if (recent && recent.length > 0 && input.type !== "chat_message") return;

    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500) ?? null,
      href: input.href?.slice(0, 500) ?? null,
      related_offer_id: input.relatedOfferId ?? null,
      related_product_id: input.relatedProductId ?? null,
      related_thread_id: input.relatedThreadId ?? null,
    });

    if (error) {
      console.error("[notifications] insert", error.message, input.type);
    }
  } catch (e) {
    console.error("[notifications] unexpected", e);
  }
}

const CHAT_NOTIFY_WINDOW_MS = 5 * 60 * 1000;

/** Notify recipient; updates existing unread chat notification in the same thread when recent. */
export async function upsertChatMessageNotification(params: {
  userId: string;
  threadId: string;
  preview: string;
}): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    console.warn("[notifications] chat upsert skipped — no service role");
    return;
  }

  const title = "Yeni mesajın var";
  const body = params.preview.slice(0, 80);
  const href = `/chat/${params.threadId}`;

  try {
    const since = new Date(Date.now() - CHAT_NOTIFY_WINDOW_MS).toISOString();
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", params.userId)
      .eq("type", "chat_message")
      .eq("related_thread_id", params.threadId)
      .is("read_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("notifications")
        .update({
          title,
          body,
          href,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("[notifications] chat update", error.message);
      }
      return;
    }

    await createNotification({
      userId: params.userId,
      type: "chat_message",
      title,
      body,
      href,
      relatedThreadId: params.threadId,
    });
  } catch (e) {
    console.error("[notifications] chat upsert", e);
  }
}

export async function notifyFavoriteProductUnavailable(
  productId: string,
  _productTitle?: string
): Promise<void> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  try {
    const { data: favs } = await supabase
      .from("product_favorites")
      .select("user_id")
      .eq("product_id", productId);

    const title = "Kaydettiğin ürün artık uygun değil";
    const body = "Kaydettiğin bir ürün artık takasta görünmüyor.";
    const href = "/favorites";

    await Promise.all(
      (favs ?? []).map((f) =>
        createNotification({
          userId: String((f as { user_id: string }).user_id),
          type: "favorite_unavailable",
          title,
          body,
          href,
          relatedProductId: productId,
        })
      )
    );
  } catch (e) {
    console.error("[notifications] favorite_unavailable", e);
  }
}

export function mapNotificationRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: String(row.type) as NotificationType,
    title: String(row.title),
    body: row.body == null ? null : String(row.body),
    href: row.href == null ? null : String(row.href),
    related_offer_id: row.related_offer_id == null ? null : String(row.related_offer_id),
    related_product_id:
      row.related_product_id == null ? null : String(row.related_product_id),
    related_thread_id:
      row.related_thread_id == null ? null : String(row.related_thread_id),
    read_at: row.read_at == null ? null : String(row.read_at),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}
