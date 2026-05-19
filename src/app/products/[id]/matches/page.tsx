import Link from "next/link";
import { redirect } from "next/navigation";

import { FavoriteButton } from "@/components/favorite-button";
import { LocationProximityBadgeChip } from "@/components/location-proximity-badge";
import { StartChatButton } from "@/components/start-chat-button";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { getLocationProximityBadge } from "@/lib/geo";
import { fetchFavoriteProductIds } from "@/lib/favorites.server";
import { fetchPublicProfile } from "@/lib/profiles.server";
import { buildViewerLocation } from "@/lib/viewer-location";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { BARTER_MATCHES_SUBTITLE, formatBarterBalanceLabel } from "@/lib/barter-copy";
import { getMatchLabel } from "@/lib/product-value";
import { loadMatchesPageData } from "@/lib/offer-load";
import { cn } from "@/lib/utils";

import { Camera } from "lucide-react";

export const metadata = {
  title: "Denk Takas Alanı",
};

export default async function DenkTakasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const range = sp.range != null ? Number(sp.range) : 10;
  const rangePct =
    Number.isFinite(range) && range > 0 && range <= 100 ? range : 10;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadMatchesPageData(id, rangePct);

  const [profile, savedIds] = user
    ? await Promise.all([
        fetchPublicProfile(user.id),
        fetchFavoriteProductIds(user.id),
      ])
    : [null, new Set<string>()];
  const viewer = buildViewerLocation({ profileLocation: profile?.location ?? null });

  if (!data.ok) {
    if (data.reason === "auth") {
      redirect(`/login?next=${encodeURIComponent(`/products/${id}/matches`)}`);
    }
    return (
      <div className="mx-auto max-w-lg px-3 py-16 text-center">
        <p className="text-sm font-medium text-neutral-600">
          {data.reason === "forbidden"
            ? "Bu ürün için denk takasları görüntüleyemezsin."
            : data.reason === "not_found"
              ? "Ürün bulunamadı."
              : data.reason === "bad_request"
                ? (data.message ??
                  "Bu ürün için değer bilgisi bulunamadı.")
                : data.message ?? "Eşleşmeler yüklenemedi."}
        </p>
        <Link href="/discover" className={cn(buttonVariants({ className: "mt-6" }))}>
          Keşfet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-5">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Özel eşleşme
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Denk Takas Alanı
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {BARTER_MATCHES_SUBTITLE}
        </p>
        {data.matches.length > 0 ? (
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            Benzer değer bandındaki ürünler listelenir.
          </p>
        ) : null}
      </header>

      {data.matches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#ff4f01]/30 bg-white/70 px-6 py-14 text-center text-sm font-medium text-neutral-600">
          <p className="font-semibold text-neutral-800">
            Bu ürünle denk takas adayı bulunamadı.
          </p>
          <p className="mt-2 text-neutral-500">
            Farklı bir ürün seçebilir veya takas paketini genişletebilirsin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.matches.map((m) => {
            const ai = fallbackBadgeLabel(m.ai_badge_label, m.ai_badge_color);
            const balance = getMatchLabel(m.value_match_score);
            const proximityBadge = getLocationProximityBadge(viewer, {
              lat: m.lat ?? null,
              lng: m.lng ?? null,
              location: m.location,
              city: m.city ?? null,
            });
            return (
              <article
                key={m.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/[0.04]"
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {m.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-400">
                      <Camera className="size-10" aria-hidden />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col gap-1.5">
                    <span className="rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      Denk takas adayı
                    </span>
                    {proximityBadge ? (
                      <LocationProximityBadgeChip badge={proximityBadge} variant="overlay" />
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="line-clamp-2 text-base font-bold text-neutral-900">{m.title}</h2>
                  <p className="text-xs text-neutral-500">📍 {m.location}</p>
                  <p className="text-xs text-neutral-500">{m.category}</p>
                  <p className="text-xs text-neutral-600">Durum: {m.condition}</p>
                  <ValueBadge label={ai.label} color={ai.color} />
                  <p className="text-sm font-bold text-[#ff4f01]">
                    {formatBarterBalanceLabel(balance)}
                  </p>
                  {(m.description_preview ?? m.description) ? (
                    <p className="line-clamp-2 text-xs text-neutral-500">
                      {m.description_preview ?? m.description}
                    </p>
                  ) : null}
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <Link
                      href={`/offers/new?${new URLSearchParams({
                        requestedProductId: m.id,
                        offeredProductIds: id,
                      }).toString()}`}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "w-full rounded-full border-0 bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
                      )}
                    >
                      Takas teklif et
                    </Link>
                    <StartChatButton
                      otherUserId={m.owner_id}
                      productId={m.id}
                      viewerId={user?.id ?? null}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    />
                    {user && m.owner_id !== user.id ? (
                      <FavoriteButton
                        productId={m.id}
                        initialSaved={savedIds.has(m.id)}
                        viewerId={user.id}
                        variant="button"
                        size="sm"
                        className="w-full"
                        loginNext={`/products/${id}/matches`}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
