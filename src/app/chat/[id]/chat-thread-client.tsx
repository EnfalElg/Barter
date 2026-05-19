"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { TrustBadge } from "@/components/trust-badge";
import { Button } from "@/components/ui/button";
import { formatRatingAverage } from "@/lib/trust-score";
import { Input } from "@/components/ui/input";
import type { ChatMessageRow, ChatThreadDetail } from "@/lib/types/chat";
import { cn } from "@/lib/utils";

import { Loader2, Send } from "lucide-react";

export function ChatThreadClient({ initial }: { initial: ChatThreadDetail }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageRow[]>(initial.messages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(initial.thread.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: ChatMessageRow;
        error?: string;
      };
      if (!res.ok || !data.success || !data.message) {
        throw new Error(data.error ?? "Gönderilemedi");
      }
      setMessages((prev) => [...prev, data.message!]);
      setText("");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  }, [initial.thread.id, router, text]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col px-3 sm:px-5">
      <header className="shrink-0 border-b border-orange-100 bg-white/90 py-4 backdrop-blur-sm">
        <Link href="/chat" className="text-xs font-bold text-[#ff4f01] hover:underline">
          ← Sohbetler
        </Link>
        <p className="mt-2 font-bold text-neutral-900">{initial.other_profile.display_name}</p>
        <TrustBadge score={initial.other_profile.trust_score} size="sm" className="mt-2" />
        {formatRatingAverage(
          initial.other_profile.rating_average,
          initial.other_profile.rating_count
        ) ? (
          <p className="mt-1 text-xs text-neutral-500">
            Puan:{" "}
            {formatRatingAverage(
              initial.other_profile.rating_average,
              initial.other_profile.rating_count
            )}
          </p>
        ) : null}
        {initial.product ? (
          <Link
            href={`/products/${initial.product.id}`}
            className="mt-2 flex items-center gap-2 rounded-2xl border border-orange-100 bg-white p-3 text-xs font-semibold text-neutral-800 shadow-sm hover:border-[#ff4f01]/30"
          >
            {initial.product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initial.product.image_url}
                alt=""
                className="size-10 rounded-lg object-cover"
              />
            ) : null}
            <span>Bu ürün hakkında sohbet: {initial.product.title}</span>
          </Link>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-500">İlk mesajı sen gönder.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === initial.current_user_id;
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-3xl px-4 py-2.5 text-sm shadow-sm",
                    mine
                      ? "rounded-br-md bg-[#ff4f01] text-white"
                      : "rounded-bl-md border border-orange-100/80 bg-white text-neutral-900"
                  )}
                >
                  {m.body}
                  <time className="mt-1 block text-[10px] opacity-70">
                    {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      <form
        className="shrink-0 flex gap-2 border-t border-[#fde8dc]/80 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz..."
          disabled={sending}
          className="h-12 flex-1 rounded-2xl"
        />
        <Button
          type="submit"
          disabled={sending || !text.trim()}
          className="h-12 rounded-2xl bg-[#ff4f01] px-4 font-bold hover:bg-[#e64700]"
        >
          {sending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <>
              <Send className="size-5" aria-hidden />
              <span className="sr-only">Gönder</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
