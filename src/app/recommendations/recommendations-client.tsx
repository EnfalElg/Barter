"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FavoriteButton } from "@/components/favorite-button";
import { LocationBadge } from "@/components/location-badge";
import { OwnProductPicker } from "@/components/own-product-picker";
import { RecommendationLabelBadge } from "@/components/recommendation-label-badge";
import { StartChatButton } from "@/components/start-chat-button";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import type { ViewerLocation } from "@/lib/geo";
import { getLocationHint } from "@/lib/location-utils";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RecommendationResult } from "@/lib/recommendations";
import type { PublicProduct } from "@/lib/types/product";
import { productCardShell, sectionCard } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

import { Camera, Loader2, Sparkles } from "lucide-react";

const LEVEL_RING: Record<RecommendationResult["recommendation_level"], string> = {
  excellent: "border-emerald-300/80 ring-emerald-500/15",
  good: "border-[#ff4f01]/35 ring-[#ff4f01]/15",
  okay: "border-amber-200/80 ring-amber-500/15",
  weak: "border-neutral-200 ring-neutral-400/10",
};

function offerNewHref(requestedId: string, offeredIds: string[]) {
  const q = new URLSearchParams();
  q.set("requestedProductId", requestedId);
  if (offeredIds.length) q.set("offeredProductIds", offeredIds.join(","));
  return `/offers/new?${q.toString()}`;
}

export type RecommendationsClientProps = {
  viewerId: string;
  ownProducts: PublicProduct[];
  viewer: ViewerLocation;
  savedProductIds?: string[];
};

export function RecommendationsClient({
  viewerId,
  ownProducts,
  viewer,
  savedProductIds = [],
}: RecommendationsClientProps) {
  const savedSet = useMemo(() => new Set(savedProductIds), [savedProductIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendationResult[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedIds = useMemo(() => [...selected].sort(), [selected]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setResults(null);
    setHasSearched(false);
    setError(null);
  }, []);

  const runRecommendations = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_product_ids: selectedIds, limit: 20 }),
      });
      const body = (await res.json()) as {
        recommendations?: RecommendationResult[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Öneriler alınamadı.");
      }
      setResults(body.recommendations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Öneriler alınamadı.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  return (
    <>
      <section className={cn(sectionCard, "mb-8 border-[#ff4f01]/20 bg-gradient-to-br from-white to-orange-50/30")}>
        {ownProducts.length === 0 ? (
          <EmptyState
            title="Öneri almak için ürün seç."
            description="Bir veya birkaç ürününü seç, sana uygun takas adaylarını gösterelim."
            actionLabel="Ürün Ekle"
            actionHref="/post"
          />
        ) : (
          <OwnProductPicker
            products={ownProducts}
            selectedIds={selectedIds}
            onChange={(ids) => setSelected(new Set(ids))}
            title="Ürünlerini seç"
            helperText="Bir veya birkaç ürününü seç, sana uygun takas adaylarını gösterelim."
          />
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={selectedIds.length === 0 || loading || ownProducts.length === 0}
            onClick={() => void runRecommendations()}
            variant="barter"
            size="barter"
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Öneriler hazırlanıyor...
              </>
            ) : (
              "Önerileri Göster"
            )}
          </Button>
          <Button
            type="button"
            disabled={loading && selectedIds.length === 0}
            onClick={clearSelection}
            variant="barterOutline"
            size="barter"
            className="flex-1"
          >
            Seçimi Temizle
          </Button>
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      </section>

      {loading ? (
        <p className="mb-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#ff4f01]/25 bg-white/70 px-6 py-12 text-sm font-semibold text-neutral-700">
          <Loader2 className="size-5 animate-spin text-[#ff4f01]" aria-hidden />
          Öneriler hazırlanıyor...
        </p>
      ) : null}

      {hasSearched && !loading && results?.length === 0 ? (
        <EmptyState
          className="mb-6"
          title="Uygun öneri bulunamadı."
          description="Farklı ürünler seçebilir veya ürün bilgilerini güncelleyebilirsin."
        />
      ) : null}

      {results && results.length > 0 ? (
        <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((rec) => {
            const ai = fallbackBadgeLabel(
              rec.product.ai_badge_label,
              rec.product.ai_badge_color
            );
            const locationHint = viewer.location
              ? getLocationHint({
                  userLocationText: viewer.location,
                  productLocationText: rec.product.location || rec.product.city,
                  userLat: viewer.lat,
                  userLng: viewer.lng,
                  productLat: rec.product.lat,
                  productLng: rec.product.lng,
                })
              : null;
            return (
              <li
                key={rec.product.id}
                className={cn(productCardShell, "border-2", LEVEL_RING[rec.recommendation_level])}
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {rec.product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rec.product.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-400">
                      <Camera className="size-10" aria-hidden />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <RecommendationLabelBadge
                      level={rec.recommendation_level}
                      label={rec.recommendation_label}
                    />
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-base font-black text-neutral-900">
                    {rec.product.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {rec.product.category} · {rec.product.condition}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">📍 {rec.product.location}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ValueBadge label={ai.label} color={ai.color} size="sm" />
                    {locationHint && locationHint.level !== "unknown" ? (
                      <LocationBadge hint={locationHint} size="sm" />
                    ) : null}
                  </div>

                  {rec.reasons.length > 0 ? (
                    <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
                      {rec.reasons.slice(0, 3).map((r) => (
                        <li
                          key={r}
                          className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#c2410c] ring-1 ring-orange-100"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <Link
                      href={`/products/${rec.product.id}`}
                      className={cn(
                        buttonVariants({ variant: "barterOutline", size: "sm" }),
                        "w-full"
                      )}
                    >
                      İlanı Gör
                    </Link>
                    <StartChatButton
                      otherUserId={rec.product.owner_id}
                      productId={rec.product.id}
                      viewerId={viewerId}
                      label="Sohbet Başlat"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      loginNext="/recommendations"
                    />
                    <Link
                      href={offerNewHref(rec.product.id, selectedIds)}
                      className={cn(
                        buttonVariants({ variant: "barter", size: "sm" }),
                        "w-full"
                      )}
                    >
                      Takas Teklif Et
                    </Link>
                    {rec.product.owner_id !== viewerId ? (
                      <FavoriteButton
                        productId={rec.product.id}
                        initialSaved={savedSet.has(rec.product.id)}
                        viewerId={viewerId}
                        variant="button"
                        size="sm"
                        className="w-full"
                        loginNext="/recommendations"
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!hasSearched && !loading ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-[#ff4f01]/20 bg-white/60 px-6 py-14 text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-2xl">
            <Sparkles className="size-7 text-[#ff4f01]" aria-hidden />
          </span>
          <p className="max-w-sm text-sm text-neutral-600">
            Ürünlerini seç ve önerileri göster. Fiyatlar gizli kalır; yalnızca nitel uyum
            etiketleri gösterilir.
          </p>
        </div>
      ) : null}
    </>
  );
}
