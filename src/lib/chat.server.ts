import {
  fetchPublicProfile,
  toProfileView,
  toPublicProfile,
} from "@/lib/profiles.server";
import { upsertChatMessageNotification } from "@/lib/server/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ChatMessageRow,
  ChatThreadDetail,
  ChatThreadListItem,
  ChatThreadRow,
} from "@/lib/types/chat";
import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeParticipants(
  userIdA: string,
  userIdB: string
): { participant_a: string; participant_b: string } {
  return userIdA < userIdB
    ? { participant_a: userIdA, participant_b: userIdB }
    : { participant_a: userIdB, participant_b: userIdA };
}

function mapThread(row: Record<string, unknown>): ChatThreadRow {
  return {
    id: String(row.id),
    product_id: row.product_id == null ? null : String(row.product_id),
    created_by: String(row.created_by),
    participant_a: String(row.participant_a),
    participant_b: String(row.participant_b),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): ChatMessageRow {
  return {
    id: String(row.id),
    thread_id: String(row.thread_id),
    sender_id: String(row.sender_id),
    body: String(row.body),
    created_at: String(row.created_at ?? ""),
    read_at: row.read_at == null ? null : String(row.read_at),
  };
}

export async function findOrCreateChatThread(
  supabase: SupabaseClient,
  currentUserId: string,
  otherUserId: string,
  productId: string | null
): Promise<{ ok: true; thread_id: string } | { ok: false; status: number; message: string }> {
  if (currentUserId === otherUserId) {
    return { ok: false, status: 400, message: "Kendinle sohbet başlatamazsın." };
  }

  const { participant_a, participant_b } = normalizeParticipants(currentUserId, otherUserId);

  let q = supabase
    .from("chat_threads")
    .select("*")
    .eq("participant_a", participant_a)
    .eq("participant_b", participant_b);

  if (productId) {
    q = q.eq("product_id", productId);
  } else {
    q = q.is("product_id", null);
  }

  const { data: existing } = await q.maybeSingle();

  if (existing) {
    return { ok: true, thread_id: String((existing as { id: string }).id) };
  }

  const { data: created, error } = await supabase
    .from("chat_threads")
    .insert({
      product_id: productId,
      created_by: currentUserId,
      participant_a,
      participant_b,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    if (error?.code === "23505") {
      const { data: again } = await q.maybeSingle();
      if (again) return { ok: true, thread_id: String((again as { id: string }).id) };
    }
    console.error("[chat] create thread", error?.message);
    return { ok: false, status: 500, message: "Sohbet oluşturulamadı." };
  }

  return { ok: true, thread_id: String(created.id) };
}

export async function validateChatProduct(
  supabase: SupabaseClient,
  productId: string,
  expectedOwnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("products")
    .select("id, owner_id, status")
    .eq("id", productId)
    .eq("status", "available")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Ürün bulunamadı veya artık yayında değil." };
  }

  if (String((data as { owner_id: string }).owner_id) !== expectedOwnerId) {
    return { ok: false, message: "Ürün bu kullanıcıya ait değil." };
  }

  return { ok: true };
}

export async function loadChatThreadList(userId: string): Promise<ChatThreadListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data: threads, error } = await supabase
    .from("chat_threads")
    .select("*")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error || !threads?.length) return [];

  const list = threads as Record<string, unknown>[];
  const items: ChatThreadListItem[] = [];

  for (const raw of list) {
    const t = mapThread(raw);
    const otherId = t.participant_a === userId ? t.participant_b : t.participant_a;
    const profile = await fetchPublicProfile(otherId);

    let product_title: string | null = null;
    let product_image_url: string | null = null;
    if (t.product_id) {
      const { data: prod } = await supabase
        .from("products")
        .select("title, image_url")
        .eq("id", t.product_id)
        .maybeSingle();
      if (prod) {
        product_title = String((prod as { title: string }).title ?? "");
        const img = (prod as { image_url: string | null }).image_url;
        product_image_url = img == null ? null : String(img);
      }
    }

    const { data: lastMsg } = await supabase
      .from("chat_messages")
      .select("body")
      .eq("thread_id", t.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const preview = lastMsg?.body
      ? String(lastMsg.body).length > 80
        ? `${String(lastMsg.body).slice(0, 77)}…`
        : String(lastMsg.body)
      : null;

    items.push({
      id: t.id,
      updated_at: t.updated_at,
      product_id: t.product_id,
      product_title,
      product_image_url,
      other_user_id: otherId,
      other_display_name: profile.display_name,
      other_avatar_url: profile.avatar_url,
      other_initials: profile.initials,
      last_message_preview: preview,
    });
  }

  return items;
}

export async function loadChatThreadDetail(
  threadId: string,
  userId: string
): Promise<ChatThreadDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data: raw, error } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error || !raw) return null;

  const thread = mapThread(raw as Record<string, unknown>);
  if (thread.participant_a !== userId && thread.participant_b !== userId) {
    return null;
  }

  const otherId = thread.participant_a === userId ? thread.participant_b : thread.participant_a;
  const profile = await fetchPublicProfile(otherId);

  let product: ChatThreadDetail["product"] = null;
  if (thread.product_id) {
    const { data: prod } = await supabase
      .from("products")
      .select("id, title, image_url, status")
      .eq("id", thread.product_id)
      .maybeSingle();
    if (prod && String((prod as { status: string }).status) === "available") {
      product = {
        id: String((prod as { id: string }).id),
        title: String((prod as { title: string }).title),
        image_url:
          (prod as { image_url: string | null }).image_url == null
            ? null
            : String((prod as { image_url: string | null }).image_url),
      };
    }
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return {
    thread,
    messages: (messages ?? []).map((m) => mapMessage(m as Record<string, unknown>)),
    other_user_id: otherId,
    other_profile: {
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      initials: profile.initials,
      trust_score: profile.trust_score,
      completed_swaps: profile.completed_swaps,
      rating_average: profile.rating_average,
      rating_count: profile.rating_count,
    },
    product,
    current_user_id: userId,
  };
}

export async function sendChatMessage(
  threadId: string,
  userId: string,
  body: string
): Promise<
  | { ok: true; message: ChatMessageRow }
  | { ok: false; status: number; message: string }
> {
  const text = body.trim();
  if (!text) {
    return { ok: false, status: 400, message: "Mesaj boş olamaz." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, participant_a, participant_b")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread) {
    return { ok: false, status: 404, message: "Sohbet bulunamadı." };
  }

  const t = thread as { participant_a: string; participant_b: string };
  if (t.participant_a !== userId && t.participant_b !== userId) {
    return { ok: false, status: 403, message: "Bu sohbete erişimin yok." };
  }

  const { data: inserted, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_id: userId,
      body: text.slice(0, 4000),
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return { ok: false, status: 500, message: "Mesaj gönderilemedi." };
  }

  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  const recipientId =
    t.participant_a === userId ? t.participant_b : t.participant_a;
  const preview =
    text.length > 80 ? `${text.slice(0, 77)}…` : text;

  void upsertChatMessageNotification({
    userId: recipientId,
    threadId,
    preview,
  });

  return { ok: true, message: mapMessage(inserted as Record<string, unknown>) };
}

/** Batch profile views for list UIs */
export async function fetchProfileViews(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ReturnType<typeof toProfileView>>> {
  const map = new Map<string, ReturnType<typeof toProfileView>>();
  if (userIds.length === 0) return map;

  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", userIds);

  for (const id of userIds) {
    const row = (data ?? []).find((r) => String((r as { id: string }).id) === id);
    if (row) {
      map.set(id, toProfileView(toPublicProfile(row as Record<string, unknown>)));
    } else {
      map.set(
        id,
        toProfileView({
          id,
          full_name: null,
          username: null,
          avatar_url: null,
          location: null,
          bio: null,
          trust_score: 50,
          completed_swaps: 0,
          rating_average: 0,
          rating_count: 0,
          created_at: new Date().toISOString(),
          wanted_categories: [],
          wanted_keywords: [],
        })
      );
    }
  }
  return map;
}

const PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, location, bio, trust_score, completed_swaps, rating_average, rating_count, created_at, wanted_categories, wanted_keywords";
