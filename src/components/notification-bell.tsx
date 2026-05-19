"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationBellProps = {
  initialUnread?: number;
  className?: string;
  /** Show "Bildirimler" label (desktop top nav). */
  showLabel?: boolean;
};

export function NotificationBell({
  initialUnread = 0,
  className,
  showLabel = false,
}: NotificationBellProps) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (!res.ok) return;
      const body = (await res.json()) as { unread_count?: number };
      setUnread(Math.max(0, body.unread_count ?? 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(t);
  }, [refresh, pathname]);

  return (
    <Link
      href="/notifications"
      className={cn(
        showLabel
          ? "relative inline-flex shrink-0 items-center gap-1.5"
          : buttonVariants({
              variant: "ghost",
              size: "sm",
              className:
                "relative gap-1.5 rounded-full px-3 font-bold text-neutral-700 hover:bg-[#ff4f01]/10 hover:text-[#ff4f01]",
            }),
        className
      )}
      aria-label={unread > 0 ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
      aria-current={
        pathname === "/notifications" || pathname.startsWith("/notifications/")
          ? "page"
          : undefined
      }
    >
      <Bell className="size-4 shrink-0" aria-hidden />
      {showLabel ? <span>Bildirimler</span> : null}
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-[#ff4f01] px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
