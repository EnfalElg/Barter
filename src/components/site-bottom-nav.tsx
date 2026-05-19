"use client";

import { Compass, Inbox, MessageCircle, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/discover", label: "Keşfet", icon: Compass },
  { href: "/recommendations", label: "Öneriler", icon: Sparkles },
  { href: "/offers", label: "Teklifler", icon: Inbox },
  { href: "/chat", label: "Sohbetler", icon: MessageCircle },
  { href: "/profile", label: "Profilim", icon: UserRound },
] as const;

export function SiteBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#fde8dc]/90 bg-white/90 backdrop-blur-xl sm:hidden"
      aria-label="Ana menü"
    >
      <ul className="mx-auto flex max-w-lg list-none justify-around p-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-w-[3.5rem] flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-bold transition",
                  active ? "text-[#ff4f01]" : "text-neutral-500"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
