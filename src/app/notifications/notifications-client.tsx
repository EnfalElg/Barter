"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { NOTIFICATION_TYPE_ICON } from "@/lib/notification-icons";
import type { NotificationListItem } from "@/lib/types/notification";
import { cn } from "@/lib/utils";

import { Loader2 } from "lucide-react";

export type NotificationsClientProps = {
  initialNotifications: NotificationListItem[];
  initialUnreadCount: number;
};

export function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: NotificationsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [busyAll, setBusyAll] = useState(false);

  const markRead = useCallback(async (id: string, href: string | null) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        wasUnread = !n.read_at;
        return { ...n, read_at: n.read_at ?? new Date().toISOString() };
      })
    );
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read" }),
      });
    } catch {
      // optimistic
    }

    if (href) {
      router.push(href);
    } else {
      router.refresh();
    }
  }, [router]);

  const markAllRead = useCallback(async () => {
    setBusyAll(true);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnread(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      router.refresh();
    } catch {
      router.refresh();
    } finally {
      setBusyAll(false);
    }
  }, [router]);

  const remove = useCallback(
    async (id: string) => {
      const removed = items.find((n) => n.id === id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (removed && !removed.read_at) {
        setUnread((c) => Math.max(0, c - 1));
      }
      try {
        await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        router.refresh();
      } catch {
        router.refresh();
      }
    },
    [items, router]
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="Henüz bildirimin yok."
        description="Yeni teklifler, mesajlar ve takas gelişmeleri burada görünecek."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {unread > 0 ? (
          <p className="text-sm font-semibold text-[#ff4f01]">
            Okunmamış: {unread}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Tüm bildirimler okundu.</p>
        )}
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busyAll}
            onClick={() => void markAllRead()}
            className="rounded-full font-bold"
          >
            {busyAll ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                İşleniyor...
              </>
            ) : (
              "Tümünü okundu işaretle"
            )}
          </Button>
        ) : null}
      </div>

      <ul className="list-none space-y-2 p-0">
        {items.map((n) => {
          const isUnread = !n.read_at;
          return (
            <li key={n.id}>
              <article
                className={cn(
                  "flex gap-3 rounded-2xl border p-4 transition",
                  isUnread
                    ? "border-[#ff4f01]/25 bg-[#fff7f2]/90 ring-1 ring-[#ff4f01]/10"
                    : "border-neutral-200/80 bg-white/95 ring-1 ring-black/[0.03]"
                )}
              >
                <span className="mt-0.5 text-xl leading-none" aria-hidden>
                  {NOTIFICATION_TYPE_ICON[n.type] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => void markRead(n.id, n.href)}
                    className="w-full text-left"
                  >
                    <p className="font-bold text-neutral-900">{n.title}</p>
                    {n.body ? (
                      <p className="mt-1 text-sm text-neutral-600">{n.body}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-neutral-400">
                      {new Date(n.created_at).toLocaleString("tr-TR")}
                    </p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="text-xs font-bold text-[#ff4f01] hover:underline"
                      >
                        Görüntüle
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void remove(n.id)}
                      className="text-xs font-semibold text-neutral-500 hover:text-red-700"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
