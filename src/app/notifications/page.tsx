import Link from "next/link";
import { NotificationsClient } from "@/app/notifications/notifications-client";
import { buttonVariants } from "@/components/ui/button";
import { loadUserNotifications } from "@/lib/notifications.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { Bell } from "lucide-react";

export const metadata = {
  title: "Bildirimler",
  description: "Takas, sohbet ve diğer bildirimlerin.",
};

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:px-5">
        <div className="rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-8 shadow-md ring-1 ring-black/[0.04]">
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#ff4f01]">
            <Bell className="size-3.5" aria-hidden />
            Bildirimler
          </p>
          <h1 className="mt-2 text-2xl font-black text-neutral-900">Bildirimler</h1>
          <p className="mt-4 text-sm text-neutral-600">
            Bildirimlerini görmek için giriş yapmalısın.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent("/notifications")}`}
            className={cn(buttonVariants({ className: "mt-6 rounded-2xl" }))}
          >
            Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  const { notifications, unread_count } = await loadUserNotifications(user.id);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,79,1,0.1),transparent_50%),linear-gradient(180deg,#fff7f2_0%,#faf9f7_45%,#fffdfb_100%)]"
      />

      <div className="mx-auto w-full max-w-2xl flex-1 px-3 py-6 sm:px-5 sm:py-8">
        <header className="mb-6">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#ff4f01]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#ff4f01]">
            <Bell className="size-3.5" aria-hidden />
            Bildirimler
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
            Bildirimler
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Teklif, sohbet ve değerlendirme güncellemeleri burada listelenir.
          </p>
        </header>

        <NotificationsClient
          initialNotifications={notifications}
          initialUnreadCount={unread_count}
        />
      </div>
    </div>
  );
}
