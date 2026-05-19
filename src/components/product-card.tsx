import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { LocationBadge } from "@/components/location-badge";
import { StartChatLink } from "@/components/start-chat-button";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatBarterBalanceLabel } from "@/lib/barter-copy";
import { getLocationHint } from "@/lib/location-utils";
import type { ViewerLocation } from "@/lib/geo";
import type { PublicProduct } from "@/lib/types/product";
import { productCardShell } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

import { Camera } from "lucide-react";

export type ProductCardProps = {
  product: PublicProduct;
  viewer: ViewerLocation;
  /** Bundle / denk mod — yalnızca nitel etiket (yüzde gösterilmez) */
  matchLabel?: string;
  /** Prefill /offers/new teklif ürünleri */
  tradeOfferQuery?: { offeredProductIds: string[] };
  wishCategoryLabel?: string | null;
  wishKeywordLabel?: string | null;
  viewerUserId?: string | null;
  initialSaved?: boolean;
  className?: string;
};

const PLACEHOLDER_GRADIENTS = [
  "from-[#c084fc] via-[#fb7185] to-[#fdba74]",
  "from-[#38bdf8] via-[#818cf8] to-[#f472b6]",
  "from-[#34d399] via-[#2dd4bf] to-[#fde047]",
  "from-[#a78bfa] via-[#f97316] to-[#fcd34d]",
  "from-[#f472b6] via-[#c084fc] to-[#60a5fa]",
] as const;

function placeholderGradientClass(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return PLACEHOLDER_GRADIENTS[n % PLACEHOLDER_GRADIENTS.length];
}

function offerNewHref(productId: string, offeredIds?: string[]) {
  const q = new URLSearchParams();
  q.set("requestedProductId", productId);
  if (offeredIds?.length) {
    q.set("offeredProductIds", offeredIds.join(","));
  }
  return `/offers/new?${q.toString()}`;
}

export function ProductCard({
  product,
  viewer,
  matchLabel,
  tradeOfferQuery,
  wishCategoryLabel,
  wishKeywordLabel,
  viewerUserId,
  initialSaved = false,
  className,
}: ProductCardProps) {
  const canFavorite = Boolean(viewerUserId && viewerUserId !== product.owner_id);
  const locationHint = viewer.location
    ? getLocationHint({
        userLocationText: viewer.location,
        productLocationText: product.location || product.city,
        userLat: viewer.lat,
        userLng: viewer.lng,
        productLat: product.lat,
        productLng: product.lng,
      })
    : null;

  const ai = fallbackBadgeLabel(product.ai_badge_label, product.ai_badge_color);
  const locationLabel = product.location || product.city || "Konum belirtilmedi";

  return (
    <article className={cn(productCardShell, "min-h-[480px]", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary listing URLs
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className={cn(
              "relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br",
              placeholderGradientClass(product.id)
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
            <div className="relative flex size-16 items-center justify-center rounded-full bg-white/25 shadow-inner ring-2 ring-white/40 backdrop-blur-[2px]">
              <Camera className="size-8 text-white drop-shadow-md" strokeWidth={1.75} aria-hidden />
            </div>
            <span className="relative mt-3 text-xs font-semibold uppercase tracking-widest text-white/90 drop-shadow">
              Foto ekle
            </span>
          </div>
        )}

        {locationHint && locationHint.level !== "unknown" ? (
          <div className="absolute left-2.5 top-2.5 z-10 max-w-[calc(100%-5rem)]">
            <LocationBadge hint={locationHint} size="sm" className="shadow-md backdrop-blur-md" />
          </div>
        ) : null}

        {canFavorite ? (
          <div className="absolute right-2.5 top-2.5 z-10">
            <FavoriteButton
              productId={product.id}
              initialSaved={initialSaved}
              viewerId={viewerUserId}
              variant="icon"
              size="sm"
            />
          </div>
        ) : null}

        <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
          <ValueBadge label={ai.label} color={ai.color} size="md" className="max-w-full shadow-md" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 pt-2.5">
        <h3 className="line-clamp-2 text-[0.8125rem] font-bold leading-snug tracking-tight text-neutral-900">
          {product.title}
        </h3>
        <p className="line-clamp-1 min-h-[1.125rem] text-[11px] font-medium leading-tight text-neutral-500">
          📍 {locationLabel}
        </p>
        <p className="line-clamp-1 text-[11px] font-medium leading-tight text-neutral-600">
          <span className="text-neutral-400">Kategori:</span> {product.category}
        </p>
        <p className="line-clamp-1 text-[11px] font-medium leading-tight text-neutral-600">
          <span className="text-neutral-400">Durum:</span> {product.condition}
        </p>
        {product.description ? (
          <p className="line-clamp-2 min-h-[2.5rem] text-[11px] leading-relaxed text-neutral-500">
            {product.description}
          </p>
        ) : (
          <p className="min-h-[2.5rem]" aria-hidden />
        )}
        {matchLabel ? (
          <p className="line-clamp-2 rounded-xl bg-[#fff7f2] px-2.5 py-2 text-center text-[11px] font-bold text-[#ff4f01] ring-1 ring-[#ff4f01]/15">
            {formatBarterBalanceLabel(matchLabel)}
          </p>
        ) : null}
        {wishCategoryLabel ? (
          <p className="rounded-xl bg-violet-50 px-2.5 py-1.5 text-center text-[11px] font-bold text-violet-900 ring-1 ring-violet-200/80">
            {wishCategoryLabel}
          </p>
        ) : null}
        {wishKeywordLabel ? (
          <p className="rounded-xl bg-sky-50 px-2.5 py-1.5 text-center text-[11px] font-bold text-sky-900 ring-1 ring-sky-200/80">
            {wishKeywordLabel}
          </p>
        ) : null}
        <div className="mt-auto space-y-2 pt-2">
          <Link
            href={`/products/${product.id}`}
            className={cn(buttonVariants({ variant: "barter", size: "sm" }), "w-full")}
          >
            İlan detayı
          </Link>
          <Link
            href={offerNewHref(product.id, tradeOfferQuery?.offeredProductIds)}
            className={cn(buttonVariants({ variant: "barterOutline", size: "sm" }), "w-full")}
          >
            Takas teklif et
          </Link>
          <StartChatLink
            otherUserId={product.owner_id}
            productId={product.id}
            viewerId={viewerUserId ?? null}
            className="w-full"
          />
        </div>
      </div>
    </article>
  );
}
