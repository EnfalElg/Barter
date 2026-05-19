import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { loadChatThreadList } from "@/lib/chat.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { Camera, MessageCircle } from "lucide-react";

export const metadata = {
  title: "Sohbetler",
};

export default async function ChatListPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/chat")}`);
  }

  const threads = await loadChatThreadList(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">Mesajlar</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">Sohbetler</h1>
      </header>

      {threads.length === 0 ? (
        <EmptyState
          title="Henüz sohbetin yok."
          description="Bir ilan sahibine mesaj göndererek takas detaylarını konuşabilirsin."
          actionLabel="Keşfet"
          actionHref="/discover"
          icon={<MessageCircle className="size-12 text-[#ff4f01]/40" aria-hidden />}
        />
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/chat/${t.id}`}
                className="flex gap-3 rounded-3xl border border-orange-100/80 bg-white p-4 shadow-sm transition hover:border-[#ff4f01]/30 hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fff0e8] text-sm font-black text-[#ff4f01]">
                  {t.other_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.other_avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    t.other_initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-neutral-900">{t.other_display_name}</p>
                  {t.product_title ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-600">
                      {t.product_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.product_image_url}
                          alt=""
                          className="size-5 rounded object-cover"
                        />
                      ) : (
                        <Camera className="size-4 text-neutral-400" aria-hidden />
                      )}
                      {t.product_title}
                    </p>
                  ) : null}
                  {t.last_message_preview ? (
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                      {t.last_message_preview}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs italic text-neutral-400">Henüz mesaj yok</p>
                  )}
                </div>
                <time className="shrink-0 text-[10px] text-neutral-400">
                  {new Date(t.updated_at).toLocaleDateString("tr-TR")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
