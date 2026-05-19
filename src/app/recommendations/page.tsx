import Link from "next/link";

import { RecommendationsClient } from "@/app/recommendations/recommendations-client";
import { PrivateValueNote } from "@/components/private-value-note";
import { StepIndicator } from "@/components/step-indicator";
import { pageWrap } from "@/lib/ui-polish";
import { BARTER_RECOMMENDATIONS_SUBTITLE } from "@/lib/barter-copy";
import { buttonVariants } from "@/components/ui/button";
import { fetchOwnAvailableProductsForBundle } from "@/lib/explore-products";
import type { ViewerLocation } from "@/lib/geo";
import { fetchFavoriteProductIds } from "@/lib/favorites.server";
import { fetchProfileLocationContext } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildViewerLocation } from "@/lib/viewer-location";
import { cn } from "@/lib/utils";

import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Akıllı Öneriler",
  description: "Ürünlerinle denk takas adaylarını keşfet.",
};

export default async function RecommendationsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:px-5">
        <div className="rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-8 shadow-md ring-1 ring-black/[0.04]">
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#ff4f01]">
            <Sparkles className="size-3.5" aria-hidden />
            Öneriler
          </p>
          <h1 className="mt-2 text-2xl font-black text-neutral-900">
            Benim ürünlerimle ne alabilirim?
          </h1>
          <p className="mt-4 text-sm text-neutral-600">Öneri almak için giriş yapmalısın.</p>
          <Link
            href={`/login?next=${encodeURIComponent("/recommendations")}`}
            className={cn(buttonVariants({ className: "mt-6 rounded-2xl" }))}
          >
            Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  const [ownProducts, locCtx, savedIds] = await Promise.all([
    fetchOwnAvailableProductsForBundle(user.id),
    fetchProfileLocationContext(user.id),
    fetchFavoriteProductIds(user.id),
  ]);

  const viewer: ViewerLocation = buildViewerLocation({
    profileLocation: locCtx.location,
    lat: locCtx.lat,
    lng: locCtx.lng,
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,79,1,0.12),transparent_50%),linear-gradient(180deg,#fff7f2_0%,#faf9f7_45%,#fffdfb_100%)]"
      />

      <div className={pageWrap}>
        <StepIndicator
          current={1}
          steps={[
            { label: "Ürünlerini seç" },
            { label: "Önerileri gör" },
            { label: "Teklif gönder" },
          ]}
        />
        <header className="mb-6">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#ff4f01]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#ff4f01]">
            <Sparkles className="size-3.5" aria-hidden />
            Akıllı öneriler
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
            Benim ürünlerimle ne alabilirim?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-600">
            {BARTER_RECOMMENDATIONS_SUBTITLE}
          </p>
          <PrivateValueNote variant="compact" className="mt-3" />
        </header>

        <RecommendationsClient
          viewerId={user.id}
          ownProducts={ownProducts}
          viewer={viewer}
          savedProductIds={[...savedIds]}
        />
      </div>
    </div>
  );
}
