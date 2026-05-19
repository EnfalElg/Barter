import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";

import { BarterConceptBanner } from "@/components/barter-concept-banner";
import { DiscoverClient } from "@/app/discover/discover-client";
import { BARTER_TAGLINE } from "@/lib/barter-copy";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EXPLORE_AI_STATUS_OPTIONS,
  EXPLORE_CATEGORY_OPTIONS,
  EXPLORE_CONDITION_OPTIONS,
  EXPLORE_LOCATION_OPTIONS,
  EXPLORE_PROXIMITY_FILTER_OPTIONS,
  LOCATION_HINT_FILTER_OPTIONS,
  fetchExploreProducts,
  fetchOwnAvailableProductsForBundle,
} from "@/lib/explore-products";
import type { ProximityFilter } from "@/lib/geo";
import type { LocationHintFilter } from "@/lib/location-utils";
import { fetchFavoriteProductIds } from "@/lib/favorites.server";
import { fetchProfileLocationContext, fetchPublicProfile } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildViewerLocation } from "@/lib/viewer-location";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Keşfet",
  description:
    "Tüm takas ilanları — Fiyat yok, denge var. İsteğe bağlı filtrelerle keşfet.",
};

function firstParam(
  v: string | string[] | undefined
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

const AI_LABEL: Record<string, string> = {
  fair: "Makul değer",
  slightly_low: "Biraz düşük",
  very_low: "Çok düşük",
  slightly_high: "Biraz yüksek",
  very_high: "Çok yüksek",
  unknown: "AI emin değil",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const category = firstParam(sp.category)?.trim();
  const location = firstParam(sp.location)?.trim();
  const condition = firstParam(sp.condition)?.trim();
  const ai_value_status = firstParam(sp.ai_status)?.trim();
  const search = firstParam(sp.q)?.trim();
  const proximityRaw = firstParam(sp.proximity)?.trim();
  const proximity = (
    proximityRaw === "walking" ||
    proximityRaw === "nearby" ||
    proximityRaw === "same_area"
      ? proximityRaw
      : undefined
  ) as ProximityFilter | undefined;

  const locationHintRaw = firstParam(sp.location_hint)?.trim();
  const location_hint = (
    locationHintRaw === "same_area" ||
    locationHintRaw === "same_city" ||
    locationHintRaw === "far"
      ? locationHintRaw
      : undefined
  ) as LocationHintFilter | undefined;

  let viewerUserId: string | null = null;
  let profileLocation: string | null = null;
  let profileLat: number | null = null;
  let profileLng: number | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      viewerUserId = user?.id ?? null;
      if (viewerUserId) {
        const [profile, locCtx] = await Promise.all([
          fetchPublicProfile(viewerUserId),
          fetchProfileLocationContext(viewerUserId),
        ]);
        profileLocation = profile.location ?? locCtx.location;
        profileLat = locCtx.lat;
        profileLng = locCtx.lng;
      }
    } catch {
      viewerUserId = null;
    }
  }

  const viewer = buildViewerLocation({
    selectedLocation: location,
    profileLocation,
    lat: profileLat,
    lng: profileLng,
  });

  const products = await fetchExploreProducts({
    viewerUserId,
    viewer,
    filters: {
      category: category || undefined,
      location: location || undefined,
      condition: condition || undefined,
      ai_value_status: ai_value_status || undefined,
      search: search || undefined,
      proximity,
      location_hint: profileLocation ? location_hint : undefined,
    },
  });

  const [ownProducts, savedProductIds] = await Promise.all([
    viewerUserId != null
      ? fetchOwnAvailableProductsForBundle(viewerUserId)
      : Promise.resolve([]),
    viewerUserId != null
      ? fetchFavoriteProductIds(viewerUserId)
      : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,79,1,0.14),transparent_55%),linear-gradient(180deg,#fff7f2_0%,#fffdfb_35%,#f8f4ff_100%)]"
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-3 pb-10 pt-4 sm:px-5 sm:pt-6">
        <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#ff4f01]/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#ff4f01]">
              <Sparkles className="size-3.5" aria-hidden />
              Keşfet
            </p>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
              Tüm ürünler
            </h1>
            <p className="mt-1 max-w-md text-sm text-neutral-500">
              {BARTER_TAGLINE} — AI rozeti ve takas dengesi görünür; değerler gizli kalır.
            </p>
          </div>
        </header>

        <BarterConceptBanner
          viewerUserId={viewerUserId}
          loginHref={`/login?next=${encodeURIComponent("/discover")}`}
        />

        <section className="mb-6 rounded-3xl border border-orange-100/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-neutral-800">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4f01] to-orange-400 text-white shadow-md">
              <SlidersHorizontal className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Filtreler</h2>
              <p className="text-xs text-neutral-500">
                Boş bırakırsan tüm yayında ilanlar listelenir.
              </p>
            </div>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
            method="get"
          >
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="q" className="text-xs font-semibold text-neutral-600">
                Arama
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="q"
                  name="q"
                  type="search"
                  placeholder="Başlıkta ara…"
                  defaultValue={search ?? ""}
                  className="h-11 rounded-2xl border-neutral-200/80 bg-[#fffaf7] pl-10 text-base shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-neutral-600">
                Kategori
              </Label>
              <select
                id="category"
                name="category"
                defaultValue={category ?? ""}
                className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
              >
                <option value="">Tümü</option>
                {EXPLORE_CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-semibold text-neutral-600">
                Konum
              </Label>
              <select
                id="location"
                name="location"
                defaultValue={location ?? ""}
                className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
              >
                <option value="">Tümü</option>
                {EXPLORE_LOCATION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="condition" className="text-xs font-semibold text-neutral-600">
                Durum
              </Label>
              <select
                id="condition"
                name="condition"
                defaultValue={condition ?? ""}
                className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
              >
                <option value="">Tümü</option>
                {EXPLORE_CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {profileLocation ? (
              <div className="space-y-1.5">
                <Label htmlFor="location_hint" className="text-xs font-semibold text-neutral-600">
                  Yakınlık
                </Label>
                <select
                  id="location_hint"
                  name="location_hint"
                  defaultValue={location_hint ?? ""}
                  className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
                >
                  <option value="">Tümü</option>
                  {LOCATION_HINT_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="proximity" className="text-xs font-semibold text-neutral-600">
                Mesafe
              </Label>
              <select
                id="proximity"
                name="proximity"
                defaultValue={proximity ?? ""}
                className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
              >
                <option value="">Tümü</option>
                {EXPLORE_PROXIMITY_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai_status" className="text-xs font-semibold text-neutral-600">
                AI rozeti
              </Label>
              <select
                id="ai_status"
                name="ai_status"
                defaultValue={ai_value_status ?? ""}
                className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium text-neutral-900 shadow-inner focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25"
              >
                <option value="">Tümü</option>
                {EXPLORE_AI_STATUS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {AI_LABEL[c] ?? c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3 sm:flex-row">
              <Button
                type="submit"
                variant="barter"
                size="barter"
                className="flex-1"
              >
                Uygula
              </Button>
              <Link
                href="/discover"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "inline-flex h-11 flex-1 items-center justify-center rounded-2xl border-2 font-bold"
                )}
              >
                Sıfırla
              </Link>
            </div>
          </form>
        </section>

        {viewerUserId ? (
          <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50/90 to-[#fff7f2] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-black text-neutral-900">
                Ürünlerinle daha iyi eşleşmeler bul
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Akıllı öneriler; değerler gizli, denk adaylar öne çıkar.
              </p>
            </div>
            <Link
              href="/recommendations"
              className={cn(
                buttonVariants({ size: "sm" }),
                "shrink-0 rounded-full bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
              )}
            >
              Akıllı önerilere git
            </Link>
          </section>
        ) : null}

        <DiscoverClient
          viewerUserId={viewerUserId}
          initialProducts={products}
          ownProducts={ownProducts}
          viewer={viewer}
          savedProductIds={[...savedProductIds]}
          filters={{
            category: category || undefined,
            location: location || undefined,
            condition: condition || undefined,
            ai_value_status: ai_value_status || undefined,
            search: search || undefined,
            proximity,
          }}
        />
      </div>
    </div>
  );
}
