"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FavoriteButton } from "@/components/favorite-button";
import { LocationBadge } from "@/components/location-badge";
import { StartChatButton } from "@/components/start-chat-button";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { buttonVariants } from "@/components/ui/button";
import { getLocationHint } from "@/lib/location-utils";
import type { ViewerLocation } from "@/lib/geo";
import type { ProductFavorite } from "@/lib/types/favorite";
import { cn } from "@/lib/utils";

import { Camera } from "lucide-react";

export type FavoritesClientProps = {
  viewerId: string;
  initialFavorites: ProductFavorite[];
  viewer: ViewerLocation;
};

function offerNewHref(productId: string) {
  return `/offers/new?${new URLSearchParams({ requestedProductId: productId }).toString()}`;
}

export function FavoritesClient({
  viewerId,
  initialFavorites,
  viewer,
}: FavoritesClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialFavorites);

  const removeFromList = useCallback((productId: string) => {
    setItems((prev) => prev.filter((f) => f.product.id !== productId));
  }, []);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Henüz ürün kaydetmedin."
        description="İlgini çeken ürünleri kaydedip daha sonra takas teklifi gönderebilirsin."
        actionLabel="Keşfet"
        actionHref="/discover"
      />
    );
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((fav) => {
        const p = fav.product;
        const ai = fallbackBadgeLabel(p.ai_badge_label, p.ai_badge_color);
        const locationHint = viewer.location
          ? getLocationHint({
              userLocationText: viewer.location,
              productLocationText: p.location || p.city,
              userLat: viewer.lat,
              userLng: viewer.lng,
              productLat: p.lat,
              productLng: p.lng,
            })
          : null;

        return (
          <li
            key={fav.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/90 bg-white shadow-sm ring-1 ring-black/[0.04]"
          >
            <div className="relative aspect-[4/3] bg-neutral-100">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-400">
                  <Camera className="size-10" aria-hidden />
                </div>
              )}
              <div className="absolute right-2 top-2 z-10">
                <FavoriteButton
                  productId={p.id}
                  initialSaved
                  viewerId={viewerId}
                  variant="icon"
                  size="sm"
                  loginNext="/favorites"
                  onSavedChange={(saved) => {
                    if (!saved) {
                      removeFromList(p.id);
                      router.refresh();
                    }
                  }}
                />
              </div>
              {locationHint && locationHint.level !== "unknown" ? (
                <div className="absolute left-2 top-2 z-10 max-w-[calc(100%-3rem)]">
                  <LocationBadge hint={locationHint} size="sm" className="shadow-md backdrop-blur-md" />
                </div>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col p-4">
              <h2 className="line-clamp-2 text-base font-black text-neutral-900">{p.title}</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {p.category} · {p.condition}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">📍 {p.location}</p>
              <div className="mt-2">
                <ValueBadge label={ai.label} color={ai.color} size="sm" />
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-4">
                <Link
                  href={`/products/${p.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full rounded-full font-bold"
                  )}
                >
                  İlanı Gör
                </Link>
                <Link
                  href={offerNewHref(p.id)}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "w-full rounded-full border-0 bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
                  )}
                >
                  Takas Teklif Et
                </Link>
                <StartChatButton
                  otherUserId={p.owner_id}
                  productId={p.id}
                  viewerId={viewerId}
                  label="Sohbet Başlat"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  loginNext="/favorites"
                />
                <FavoriteButton
                  productId={p.id}
                  initialSaved
                  viewerId={viewerId}
                  variant="button"
                  size="sm"
                  className="w-full"
                  savedLabel="Kaydı Kaldır"
                  unsavedLabel="Kaydet"
                  loginNext="/favorites"
                  onSavedChange={(saved) => {
                    if (!saved) {
                      removeFromList(p.id);
                      router.refresh();
                    }
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
