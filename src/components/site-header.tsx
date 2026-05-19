"use client";

import {
  Bell,
  Bookmark,
  Compass,
  HeartHandshake,
  Inbox,
  Loader2,
  LogOut,
  MessageCircle,
  PlusCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { NotificationBell } from "@/components/notification-bell";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type { User } from "@supabase/supabase-js";

/** Always visible in the top header — same for guests and signed-in users. */
const mainNavItems = [
  { href: "/discover", label: "Keşfet", icon: Compass },
  { href: "/recommendations", label: "Öneriler", icon: Sparkles },
  { href: "/offers", label: "Teklifler", icon: Inbox },
  { href: "/chat", label: "Sohbetler", icon: MessageCircle },
  { href: "/profile", label: "Profilim", icon: UserRound },
  { href: "/notifications", label: "Bildirimler", icon: Bell },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean): string {
  return cn(
    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm",
    active
      ? "bg-[#ff4f01] text-white shadow-sm"
      : "text-neutral-600 hover:bg-orange-50 hover:text-[#ff4f01]"
  );
}

export function SiteHeader({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  const initial = user?.email?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-orange-100 bg-white/85 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-2 sm:gap-3 sm:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-black tracking-tight text-neutral-900"
        >
          <span className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4f01] to-orange-400 text-white shadow-lg shadow-orange-500/30 sm:size-10">
            <HeartHandshake className="size-4 sm:size-5" aria-hidden />
          </span>
          <span className="hidden text-base lowercase sm:inline sm:text-xl">barter</span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
          aria-label="Ana gezinme"
        >
          {mainNavItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname || "", href);

            if (href === "/notifications") {
              return (
                <NotificationBell
                  key={href}
                  showLabel
                  className={navLinkClass(active)}
                />
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={navLinkClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link
                href="/favorites"
                className={cn(
                  navLinkClass(isNavActive(pathname || "", "/favorites")),
                  "hidden lg:inline-flex"
                )}
                title="Favorilerim"
              >
                <Bookmark className="size-4" aria-hidden />
                <span className="hidden xl:inline whitespace-nowrap">Favoriler</span>
              </Link>
              <Link
                href="/post"
                className={buttonVariants({
                  size: "sm",
                  className:
                    "hidden gap-1 rounded-full bg-[#ff4f01] px-2.5 font-bold text-white hover:bg-[#e64700] lg:inline-flex sm:px-3",
                })}
              >
                <PlusCircle className="size-4" aria-hidden />
                <span className="hidden xl:inline">Ürün Ekle</span>
              </Link>
              <span
                className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4f01]/15 to-orange-400/20 text-xs font-black text-[#ff4f01] ring-2 ring-[#ff4f01]/20 sm:flex sm:size-9 sm:text-sm"
                title={user.email ?? "Hesap"}
              >
                {initial}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="hidden rounded-full border-[#fde8dc] px-2 font-bold text-neutral-800 hover:border-[#ff4f01]/40 hover:bg-[#fff7f2] sm:inline-flex sm:px-3"
              >
                <LogOut className="size-4 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </>
          ) : !supabase ? (
            <Link
              href={loginHref}
              className={buttonVariants({
                size: "sm",
                variant: "outline",
                className:
                  "shrink-0 rounded-full border-dashed px-2.5 text-xs font-bold text-neutral-500 sm:px-3 sm:text-sm",
              })}
            >
              Auth
            </Link>
          ) : loading ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 sm:size-9">
              <Loader2 className="size-4 animate-spin text-neutral-400" aria-hidden />
            </span>
          ) : (
            <Link
              href={loginHref}
              className={buttonVariants({
                size: "sm",
                className:
                  "shrink-0 rounded-full bg-[#ff4f01] px-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:bg-[#e64700] sm:px-4 sm:text-sm",
              })}
            >
              Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
