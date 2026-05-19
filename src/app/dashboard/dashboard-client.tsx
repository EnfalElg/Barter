"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { OwnProductPicker } from "@/components/own-product-picker";
import { RecommendationLabelBadge } from "@/components/recommendation-label-badge";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { BARTER_SUPPORTING, BARTER_TAGLINE } from "@/lib/barter-copy";
import type { DashboardData } from "@/lib/dashboard.server";
import type { RecommendationResult } from "@/lib/recommendations";
import type { PublicProduct } from "@/lib/types/product";
import { Button, buttonVariants } from "@/components/ui/button";
import { eyebrow, heroPanel, pageWrap, sectionCard, sectionTitle } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

import {
  Camera,
  Compass,
  Inbox,
  Loader2,
  Package,
  PlusCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function offerNewHref(requestedId: string, offeredIds: string[]) {
  const q = new URLSearchParams();
  q.set("requestedProductId", requestedId);
  if (offeredIds.length) q.set("offeredProductIds", offeredIds.join(","));
  return `/offers/new?${q.toString()}`;
}

export type DashboardClientProps = DashboardData;

export function DashboardClient({
  ownProducts,
  latestProducts,
  pendingIncoming,
  pendingOutgoing,
}: DashboardClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RecommendationResult[] | null>(null);

  const pendingTotal = pendingIncoming + pendingOutgoing;

  const runPreview = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setLoadingRecs(true);
    setRecError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_product_ids: selectedIds, limit: 4 }),
      });
      const body = (await res.json()) as {
        recommendations?: RecommendationResult[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Öneriler alınamadı.");
      setPreview(body.recommendations ?? []);
    } catch (e) {
      setRecError(e instanceof Error ? e.message : "Öneriler alınamadı.");
      setPreview(null);
    } finally {
      setLoadingRecs(false);
    }
  }, [selectedIds]);

  const quickLinks = useMemo(
    () => [
      { href: "/post", label: "Ürün Ekle", icon: PlusCircle },
      { href: "/recommendations", label: "Önerileri Gör", icon: Sparkles },
      { href: "/discover", label: "Keşfet", icon: Compass },
    ],
    []
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,79,1,0.12),transparent_50%),linear-gradient(180deg,#fff7f2_0%,#faf9f7_45%,#fffdfb_100%)]"
      />

      <div className={pageWrap}>
        <section className={cn(heroPanel, "mb-8")}>
          <p className={eyebrow}>Ana sayfa</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Elindekilerle ne alabilirsin?
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600">
            Ürünlerini seç, sana denk takas adaylarını önerelim. Fiyatlar gizli kalır.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/post"
              className={cn(buttonVariants({ variant: "barter", size: "barter" }))}
            >
              Ürün Ekle
            </Link>
            <Link
              href="/recommendations"
              className={cn(buttonVariants({ variant: "barterOutline", size: "barter" }))}
            >
              Önerileri Gör
            </Link>
          </div>
        </section>

        <section className={cn(sectionCard, "mb-6")}>
          <h2 className={sectionTitle}>Hızlı Başla</h2>
          <ul className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] px-4 py-3 text-sm font-bold text-neutral-900 transition hover:border-[#ff4f01]/40 hover:bg-[#fff0e8]"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-[#ff4f01]/10 text-[#ff4f01]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={sectionCard}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className={sectionTitle}>Ürünlerim</h2>
              <Link
                href="/profile"
                className="text-xs font-bold text-[#ff4f01] hover:underline"
              >
                Tümünü Gör
              </Link>
            </div>
            {latestProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ff4f01]/25 bg-[#fffaf7]/80 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-neutral-800">
                  Henüz ürün eklemedin.
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  İlk ürününü ekleyerek takas önerileri alabilirsin.
                </p>
                <Link
                  href="/post"
                  className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}
                >
                  Ürün Ekle
                </Link>
              </div>
            ) : (
              <ul className="flex list-none flex-col gap-2 p-0">
                {latestProducts.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </ul>
            )}
          </section>

          <section className={sectionCard}>
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="size-4 text-[#ff4f01]" aria-hidden />
              <h2 className={sectionTitle}>Bekleyen Teklifler</h2>
            </div>
            <p className="text-2xl font-black text-neutral-900">{pendingTotal}</p>
            <p className="mt-1 text-xs text-neutral-600">
              Gelen: {pendingIncoming} · Giden: {pendingOutgoing}
            </p>
            <Link
              href="/offers"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-4 rounded-full font-bold"
              )}
            >
              Tekliflere Git
            </Link>
          </section>
        </div>

        <section className={cn(sectionCard, "mt-6 border-[#ff4f01]/20 bg-gradient-to-br from-white to-orange-50/40")}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff4f01] text-white shadow-md">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-black text-neutral-900">Sana Önerilenler</h2>
              {ownProducts.length === 0 ? (
                <p className="mt-1 text-sm text-neutral-600">
                  Öneri almak için önce bir ürün ekle.
                </p>
              ) : (
                <p className="mt-1 text-xs text-neutral-600">
                  Ürünlerini seç ve önizleme al.
                </p>
              )}
            </div>
          </div>

          {ownProducts.length > 0 ? (
            <>
              <OwnProductPicker
                products={ownProducts}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                compact
                helperText="Bir veya birkaç ürününü seç."
              />
              <Button
                type="button"
                disabled={selectedIds.length === 0 || loadingRecs}
                onClick={() => void runPreview()}
                className="mt-4 h-11 w-full rounded-2xl bg-[#ff4f01] font-black text-white hover:bg-[#e64700] sm:w-auto sm:px-8"
              >
                {loadingRecs ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Hazırlanıyor...
                  </>
                ) : (
                  "Bunlarla ne alabilirim?"
                )}
              </Button>
              {recError ? (
                <p className="mt-2 text-sm font-medium text-red-700">{recError}</p>
              ) : null}
              {preview && preview.length > 0 ? (
                <ul className="mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                  {preview.map((rec) => (
                    <RecommendationPreviewCard
                      key={rec.product.id}
                      rec={rec}
                      offeredIds={selectedIds}
                    />
                  ))}
                </ul>
              ) : preview && preview.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-600">
                  Bu seçimle uygun öneri bulunamadı.
                </p>
              ) : null}
              <Link
                href="/recommendations"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#ff4f01] hover:underline"
              >
                Tüm önerileri gör
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          ) : (
            <Link
              href="/post"
              className={cn(buttonVariants({ size: "sm" }), "mt-2 rounded-full")}
            >
              Ürün Ekle
            </Link>
          )}
        </section>

        <section className={cn(sectionCard, "mt-6 border-orange-100 bg-orange-50/30")}>
          <p className="text-sm font-black text-neutral-900">{BARTER_TAGLINE}</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{BARTER_SUPPORTING}</p>
          <Link
            href="/demo"
            className="mt-3 inline-flex text-xs font-bold text-[#ff4f01] underline-offset-2 hover:underline"
          >
            Demo rehberi →
          </Link>
        </section>
      </div>
    </div>
  );
}

function ProductRow({ product }: { product: PublicProduct }) {
  const ai = fallbackBadgeLabel(product.ai_badge_label, product.ai_badge_color);
  return (
    <li>
      <Link
        href={`/products/${product.id}`}
        className="flex items-center gap-3 rounded-2xl border border-[#fde8dc]/60 bg-white p-2 transition hover:border-[#ff4f01]/30"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              <Package className="size-5" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-bold text-neutral-900">{product.title}</p>
          <p className="text-[10px] text-neutral-500">{product.category}</p>
        </div>
        <ValueBadge label={ai.label} color={ai.color} size="sm" />
      </Link>
    </li>
  );
}

function RecommendationPreviewCard({
  rec,
  offeredIds,
}: {
  rec: RecommendationResult;
  offeredIds: string[];
}) {
  const ai = fallbackBadgeLabel(rec.product.ai_badge_label, rec.product.ai_badge_color);
  const reasons = rec.reasons.slice(0, 2);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-white/90 bg-white shadow-sm ring-1 ring-black/[0.04]">
      <div className="relative aspect-[16/10] bg-neutral-100">
        {rec.product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rec.product.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Camera className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <RecommendationLabelBadge
            level={rec.recommendation_level}
            label={rec.recommendation_label}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-black text-neutral-900">
          {rec.product.title}
        </h3>
        <p className="mt-0.5 text-[10px] text-neutral-500">{rec.product.category}</p>
        <div className="mt-2">
          <ValueBadge label={ai.label} color={ai.color} size="sm" />
        </div>
        {reasons.length > 0 ? (
          <ul className="mt-2 flex list-none flex-wrap gap-1 p-0">
            {reasons.map((r) => (
              <li
                key={r}
                className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#c2410c] ring-1 ring-orange-100"
              >
                {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex flex-col gap-1.5 pt-3">
          <Link
            href={`/products/${rec.product.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full rounded-full text-xs font-bold"
            )}
          >
            İlanı Gör
          </Link>
          <Link
            href={offerNewHref(rec.product.id, offeredIds)}
            className={cn(
              buttonVariants({ size: "sm" }),
              "w-full rounded-full border-0 bg-[#ff4f01] text-xs font-bold text-white hover:bg-[#e64700]"
            )}
          >
            Takas Teklif Et
          </Link>
        </div>
      </div>
    </li>
  );
}
