"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { BARTER_DISCOVER_BODY, BARTER_TAGLINE } from "@/lib/barter-copy";
import { cn } from "@/lib/utils";

import { Scale, X } from "lucide-react";

const STORAGE_KEY = "barter-concept-banner-dismissed";

export type BarterConceptBannerProps = {
  viewerUserId: string | null;
  loginHref: string;
  className?: string;
};

export function BarterConceptBanner({
  viewerUserId,
  loginHref,
  className,
}: BarterConceptBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  return (
    <section
      className={cn(
        "relative mb-5 overflow-hidden rounded-2xl border border-[#ff4f01]/25 bg-gradient-to-r from-[#fff7f2] via-white/95 to-[#fffaf7] p-4 shadow-sm ring-1 ring-[#ff4f01]/10 sm:p-5",
        className
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-full p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700"
        aria-label="Kapat"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff4f01]/12 text-[#ff4f01]">
            <Scale className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-black text-neutral-900">{BARTER_TAGLINE}</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-600">
              {BARTER_DISCOVER_BODY}
            </p>
          </div>
        </div>

        {viewerUserId ? (
          <a
            href="#bundle-match"
            className={cn(
              buttonVariants({ size: "sm" }),
              "shrink-0 rounded-full bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
            )}
          >
            Ürünlerimle Denk Ara
          </a>
        ) : (
          <Link
            href={loginHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "shrink-0 rounded-full bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
            )}
          >
            Giriş yap ve denk takasları keşfet
          </Link>
        )}
      </div>
    </section>
  );
}
