"use client";

import { Compass, Loader2, Package } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { OwnProductPicker } from "@/components/own-product-picker";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import type { BundleExploreMatch } from "@/lib/types/swap-offer";
import type { ProximityFilter, ViewerLocation } from "@/lib/geo";
import type { PublicProduct } from "@/lib/types/product";
import { sectionCard } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

type DiscoverFilters = {
  category?: string;
  location?: string;
  condition?: string;
  ai_value_status?: string;
  search?: string;
  proximity?: ProximityFilter;
};

function bundleRowToPublic(m: BundleExploreMatch): PublicProduct {
  return {
    id: m.id,
    owner_id: m.owner_id,
    title: m.title,
    description: m.description,
    category: m.category,
    condition: m.condition,
    image_url: m.image_url,
    location: m.location,
    status: m.status as PublicProduct["status"],
    ai_value_status: m.ai_value_status as PublicProduct["ai_value_status"],
    ai_badge_label: m.ai_badge_label,
    ai_badge_color: m.ai_badge_color as PublicProduct["ai_badge_color"],
    created_at: m.created_at,
    lat: null,
    lng: null,
    city: "",
    tags: [],
    quantity: 1,
    unit: "piece",
    wanted_categories: [],
    wanted_keywords: [],
  };
}

export type DiscoverClientProps = {
  viewerUserId: string | null;
  initialProducts: PublicProduct[];
  ownProducts: PublicProduct[];
  viewer: ViewerLocation;
  savedProductIds?: string[];
  filters: DiscoverFilters;
};

export type ProductCardViewer = ViewerLocation;

export function DiscoverClient({
  viewerUserId,
  initialProducts,
  ownProducts,
  viewer,
  savedProductIds = [],
  filters,
}: DiscoverClientProps) {
  const savedSet = useMemo(() => new Set(savedProductIds), [savedProductIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleActive, setBundleActive] = useState(false);
  const [bundleMatches, setBundleMatches] = useState<BundleExploreMatch[] | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [prioritizeWish, setPrioritizeWish] = useState(false);

  const selectedIds = useMemo(() => [...selected], [selected]);
  const selectedCount = selectedIds.length;

  const filterPayload = useMemo(
    () => ({
      category: filters.category,
      location: filters.location,
      condition: filters.condition,
      ai_value_status: filters.ai_value_status,
      search: filters.search,
    }),
    [
      filters.category,
      filters.location,
      filters.condition,
      filters.ai_value_status,
      filters.search,
    ]
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setBundleActive(false);
    setBundleMatches(null);
    setBundleError(null);
  }, []);

  const runBundle = useCallback(async () => {
    if (!viewerUserId || selectedIds.length === 0) return;
    setBundleLoading(true);
    setBundleError(null);
    try {
      const res = await fetch("/api/discover/bundle-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: selectedIds,
          range: 10,
          prioritize_wish: prioritizeWish,
          ...filterPayload,
        }),
      });
      const body = (await res.json()) as {
            matches?: (BundleExploreMatch & {
              wish_category_label?: string | null;
              wish_keyword_label?: string | null;
            })[];
            error?: string;
          };
      if (!res.ok) {
        throw new Error(body.error ?? "İstek başarısız");
      }
      setBundleMatches(body.matches ?? []);
      setBundleActive(true);
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : "Bir hata oluştu");
      setBundleMatches(null);
      setBundleActive(false);
    } finally {
      setBundleLoading(false);
    }
  }, [viewerUserId, selectedIds, filterPayload, prioritizeWish]);

  return (
    <>
      {viewerUserId && ownProducts.length > 0 ? (
        <section
          id="bundle-match"
          className={cn(sectionCard, "mb-6 scroll-mt-24 border-[#ff4f01]/20 bg-gradient-to-br from-white to-orange-50/40")}
        >
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff4f01] text-white shadow-md">
              <Package className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-black text-neutral-900">Ürünlerimle Denk Ara</h2>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 sm:text-sm">
                Bir veya daha fazla ürününü seç. Gizli değer sinyallerine göre denk takas
                adaylarını listeleriz — fiyat gösterilmez.
              </p>
            </div>
          </div>

          <OwnProductPicker
            products={ownProducts}
            selectedIds={selectedIds}
            onChange={(ids) => setSelected(new Set(ids))}
            compact
            helperText="Bir veya daha fazla ürününü seç."
          />

          <label className="mb-3 mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-700">
            <input
              type="checkbox"
              checked={prioritizeWish}
              onChange={(e) => setPrioritizeWish(e.target.checked)}
              className="size-4 rounded border-neutral-300 text-[#ff4f01] focus:ring-[#ff4f01]/30"
            />
            İsteklerime uygun olanları öne çıkar
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={selectedCount === 0 || bundleLoading}
              onClick={() => void runBundle()}
              className="h-11 flex-1 rounded-2xl bg-[#ff4f01] font-black text-white shadow-lg hover:bg-[#e64700]"
            >
              {bundleLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Yükleniyor…
                </>
              ) : (
                "Denk Ürünleri Göster"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={bundleLoading && selectedCount === 0}
              onClick={clearSelection}
              className="h-11 flex-1 rounded-2xl border-2 font-bold"
            >
              Seçimi Temizle
            </Button>
          </div>

          {bundleError ? (
            <p className="mt-3 text-sm font-medium text-red-700">{bundleError}</p>
          ) : null}

          {bundleActive ? (
            <div className="mt-4 rounded-2xl border border-[#fde8dc] bg-white/80 px-3 py-3 text-sm text-neutral-700">
              <p className="font-bold text-neutral-900">Seçtiğin ürünlerle denk takas adayları</p>
              <p className="mt-1 text-xs text-neutral-600">
                Değerler gizli; takas dengesi arka planda hesaplanır.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {bundleActive && bundleMatches && bundleMatches.length === 0 ? (
        <div className="mb-6 rounded-3xl border border-dashed border-[#ff4f01]/30 bg-white/70 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            Bu ürünlerle denk takas adayı bulunamadı.
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Farklı bir ürün seçebilir veya takas paketini genişletebilirsin.
          </p>
        </div>
      ) : null}

      {bundleActive && bundleMatches && bundleMatches.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bundleMatches.map((m) => (
            <ProductCard
              key={m.id}
              product={bundleRowToPublic(m)}
              viewer={viewer}
              viewerUserId={viewerUserId}
              initialSaved={savedSet.has(m.id)}
              matchLabel={m.match_label}
              wishCategoryLabel={m.wish_category_label}
              wishKeywordLabel={m.wish_keyword_label}
              tradeOfferQuery={{ offeredProductIds: selectedIds }}
              className="h-full"
            />
          ))}
        </div>
      ) : !bundleActive && initialProducts.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewer={viewer}
              viewerUserId={viewerUserId}
              initialSaved={savedSet.has(product.id)}
              className="h-full"
            />
          ))}
        </div>
      ) : !bundleActive ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#ff4f01]/25 bg-white/60 px-6 py-16 text-center backdrop-blur-sm">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-violet-600">
            <Compass className="size-7" aria-hidden />
          </div>
          <p className="max-w-sm text-sm font-semibold text-neutral-800">
            Uygun ürün bulunamadı.
          </p>
          <p className="mt-2 max-w-sm text-sm text-neutral-600">
            Filtreleri temizleyerek daha fazla takas adayı görebilirsin.
          </p>
        </div>
      ) : null}
    </>
  );
}
