import Link from "next/link";

import { AiUncertaintyHelp } from "@/components/ai-uncertainty-help";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductDetailLocation } from "@/components/product-detail-location";
import { ProductSafetyHints } from "@/components/product-safety-hints";
import { WantedTags } from "@/components/wanted-tags";
import { SellerProfileCard } from "@/components/seller-profile-card";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import type { ViewerLocation } from "@/lib/geo";
import { fetchFavoriteProductIds } from "@/lib/favorites.server";
import { fetchProfileLocationContext, fetchPublicProfile } from "@/lib/profiles.server";
import { buildViewerLocation } from "@/lib/viewer-location";
import { buttonVariants } from "@/components/ui/button";
import { BARTER_VALUE_HIDDEN_OWNER } from "@/lib/barter-copy";
import {
  aiStatusExplanation,
  sanitizeOwnerProduct,
  sanitizePublicProduct,
} from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OwnerProduct, PublicProduct } from "@/lib/types/product";
import type { PublicProfileView } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

import { Camera } from "lucide-react";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return <ProductMissing subtitle="Sunucu yapılandırması eksik." />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return <ProductMissing />;
  }

  const rec = row as Record<string, unknown>;
  const ownerId = String(rec.owner_id ?? "");
  const isOwner = Boolean(user?.id && user.id === ownerId);
  const rawStatus = rec.status;
  const normalizedRaw =
    rawStatus == null || (typeof rawStatus === "string" && rawStatus.trim() === "")
      ? "available"
      : String(rawStatus).toLowerCase().trim();

  if (normalizedRaw === "deleted") {
    if (isOwner) {
      const p = sanitizeOwnerProduct(rec);
      return <OwnerDeletedDetail product={p} />;
    }
    return <ProductMissing />;
  }

  const effectiveStatus =
    normalizedRaw === "available" ||
    normalizedRaw === "paused" ||
    normalizedRaw === "traded" ||
    normalizedRaw === "swapped" ||
    normalizedRaw === "hidden" ||
    normalizedRaw === "reserved"
      ? normalizedRaw === "traded"
        ? "swapped"
        : normalizedRaw
      : "available";

  if (effectiveStatus === "swapped" && !isOwner) {
    return <ProductSwappedUnavailable />;
  }

  if (effectiveStatus !== "available" && !isOwner) {
    return <ProductUnavailable />;
  }

  const ownerProfile = await fetchPublicProfile(ownerId);

  if (isOwner) {
    const p = sanitizeOwnerProduct(rec);
    const ownerLoc = await fetchProfileLocationContext(user!.id);
    const ownerViewer = buildViewerLocation({
      profileLocation: ownerProfile.location ?? ownerLoc.location,
      lat: ownerLoc.lat,
      lng: ownerLoc.lng,
    });
    return (
      <OwnerDetail
        product={p}
        ownerProfile={ownerProfile}
        viewerId={user?.id ?? null}
        viewer={ownerViewer}
      />
    );
  }

  const p = sanitizePublicProduct(rec);
  let viewer: ViewerLocation = buildViewerLocation({});
  let initialSaved = false;
  if (user?.id) {
    const [profile, locCtx, savedIds] = await Promise.all([
      fetchPublicProfile(user.id),
      fetchProfileLocationContext(user.id),
      fetchFavoriteProductIds(user.id),
    ]);
    viewer = buildViewerLocation({
      profileLocation: profile.location ?? locCtx.location,
      lat: locCtx.lat,
      lng: locCtx.lng,
    });
    initialSaved = savedIds.has(p.id);
  }
  return (
    <GuestDetail
      product={p}
      ownerProfile={ownerProfile}
      viewerId={user?.id ?? null}
      viewer={viewer}
      initialSaved={initialSaved}
    />
  );
}

function ProductMissing({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:px-5">
      <div className="rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-8 shadow-md ring-1 ring-black/[0.04]">
        <h1 className="text-xl font-black text-neutral-900">İlan bulunamadı</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          {subtitle ??
            "Bu ilan kaldırılmış olabilir veya artık yayında olmayabilir."}
        </p>
        <Link
          href="/discover"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 inline-flex rounded-full border-0 bg-[#ff4f01] px-8 font-black text-white shadow-lg hover:bg-[#e64700]"
          )}
        >
          Keşfet’e dön
        </Link>
      </div>
    </div>
  );
}


function ProductSwappedUnavailable() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:px-5">
      <div className="rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-8 shadow-md ring-1 ring-black/[0.04]">
        <h1 className="text-xl font-black text-neutral-900">Takas tamamlandı</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Bu ürün artık takasta değil.
        </p>
        <Link
          href="/discover"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 inline-flex rounded-full border-0 bg-[#ff4f01] px-8 font-black text-white shadow-lg hover:bg-[#e64700]"
          )}
        >
          Keşfet’e dön
        </Link>
      </div>
    </div>
  );
}

function ProductUnavailable() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-16 text-center sm:px-5">
      <div className="rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-8 shadow-md ring-1 ring-black/[0.04]">
        <h1 className="text-xl font-black text-neutral-900">İlan bulunamadı</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Bu ilan artık yayında değil veya erişim için uygun değil.
        </p>
        <Link
          href="/discover"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 inline-flex rounded-full border-0 bg-[#ff4f01] px-8 font-black text-white shadow-lg hover:bg-[#e64700]"
          )}
        >
          Keşfet’e dön
        </Link>
      </div>
    </div>
  );
}

function pctDev(d: number | null): string {
  if (d == null || !Number.isFinite(d)) return "—";
  return `${(d * 100).toFixed(1)}%`;
}

function ProductHeroImage({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-black/[0.06]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-neutral-400">
          <Camera className="size-12" aria-hidden />
          <span className="text-xs font-medium">Görsel yok</span>
        </div>
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}

function OwnerDeletedDetail({ product }: { product: OwnerProduct }) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-3 py-8 sm:px-5">
      <div className="rounded-3xl border border-white/90 bg-white/95 p-6 shadow-[0_12px_40px_-16px_rgba(255,79,1,0.18)] ring-1 ring-black/[0.04]">
        <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
          Silinmiş ilan
        </p>
        <ProductHeroImage imageUrl={product.image_url} title={product.title} />
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {product.title}
        </h1>
        <p className="mt-4 text-sm font-semibold text-neutral-700">
          Bu ürün silinmiş. Ziyaretçilere gösterilmez; yalnızca sen görebilirsin.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full border-0 bg-[#ff4f01] font-black text-white shadow-lg hover:bg-[#e64700]"
            )}
          >
            Profilime dön
          </Link>
          <Link
            href="/discover"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full border-2 font-bold"
            )}
          >
            Keşfet
          </Link>
        </div>
      </div>
    </div>
  );
}

function OwnerDetail({
  product,
  ownerProfile,
  viewerId,
  viewer,
}: {
  product: OwnerProduct;
  ownerProfile: PublicProfileView;
  viewerId: string | null;
  viewer: ViewerLocation;
}) {
  const badge = fallbackBadgeLabel(product.ai_badge_label, product.ai_badge_color);
  const min = product.ai_min_value;
  const max = product.ai_max_value;
  const range =
    min != null && max != null && Number.isFinite(min) && Number.isFinite(max)
      ? `${Math.round(min).toLocaleString("tr-TR")} – ${Math.round(max).toLocaleString("tr-TR")}`
      : "—";

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-3 py-8 sm:px-5">
      <div className="rounded-3xl border border-white/90 bg-white/95 p-6 shadow-[0_12px_40px_-16px_rgba(255,79,1,0.18)] ring-1 ring-black/[0.04]">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Senin ilanın
        </p>
        <ProductHeroImage imageUrl={product.image_url} title={product.title} />
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {product.title}
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase text-neutral-500">
          Durum:{" "}
          {product.status === "swapped"
            ? "Takaslandı"
            : product.status === "available"
              ? "Yayında"
              : product.status}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Benim biçtiğim değer:{" "}
          <span className="font-bold text-neutral-900">
            {Math.round(product.user_value).toLocaleString("tr-TR")} TL
          </span>
        </p>
        <p className="mt-1 text-[11px] font-semibold text-neutral-500">
          {BARTER_VALUE_HIDDEN_OWNER}
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          AI tahmini aralık:{" "}
          <span className="font-semibold text-neutral-900">{range} TL</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">AI değerlendirmesi:</span>
          <ValueBadge label={badge.label} color={badge.color} size="md" />
        </div>
        {product.ai_value_status !== "unknown" &&
        product.ai_value_deviation != null ? (
          <p className="mt-2 text-sm text-neutral-600">
            Sapma: <span className="font-semibold">{pctDev(product.ai_value_deviation)}</span>
          </p>
        ) : null}
        {product.ai_value_status === "unknown" ? (
          <AiUncertaintyHelp reason={product.ai_uncertainty_reason} className="mt-4" />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            {aiStatusExplanation(product.ai_value_status ?? "unknown")}
          </p>
        )}
        {product.description ? (
          <p className="mt-4 text-sm leading-relaxed text-neutral-700">{product.description}</p>
        ) : null}
        <ProductDetailLocation
          className="mt-4"
          productLocation={`${product.location} · ${product.category} · ${product.condition}`}
          productLat={product.lat}
          productLng={product.lng}
          productCity={product.city}
          viewer={viewer}
          isOwner
          ownerTrustScore={ownerProfile.trust_score}
        />
        <section className="mt-4 rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Aradığın kategoriler
          </p>
          <WantedTags
            categories={product.wanted_categories}
            keywords={product.wanted_keywords}
            className="mt-2"
          />
        </section>
        <SellerProfileCard
          profile={ownerProfile}
          viewerId={viewerId}
          isOwner
          productId={product.id}
          className="mt-6"
        />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/products/${product.id}/matches`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full border-0 bg-[#ff4f01] font-black text-white shadow-lg hover:bg-[#e64700]"
            )}
          >
            Denk Takasları Gör
          </Link>
          <Link
            href="/discover"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full border-2 font-bold"
            )}
          >
            Keşfet
          </Link>
        </div>
      </div>
    </div>
  );
}

function GuestDetail({
  product,
  ownerProfile,
  viewerId,
  viewer,
  initialSaved = false,
}: {
  product: PublicProduct;
  ownerProfile: PublicProfileView;
  viewerId: string | null;
  viewer: ViewerLocation;
  initialSaved?: boolean;
}) {
  const badge = fallbackBadgeLabel(product.ai_badge_label, product.ai_badge_color);
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-3 py-8 sm:px-5">
      <div className="rounded-3xl border border-white/90 bg-white/95 p-6 shadow-[0_12px_40px_-16px_rgba(255,79,1,0.18)] ring-1 ring-black/[0.04]">
        <ProductHeroImage imageUrl={product.image_url} title={product.title} />
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            {product.title}
          </h1>
          {viewerId && viewerId !== product.owner_id ? (
            <FavoriteButton
              productId={product.id}
              initialSaved={initialSaved}
              viewerId={viewerId}
              variant="button"
              size="sm"
              className="shrink-0"
            />
          ) : null}
        </div>
        <div className="mt-3">
          <ValueBadge label={badge.label} color={badge.color} size="md" />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          Bu ürün değer açısından AI tarafından kontrol edildi.
        </p>
        <ProductDetailLocation
          className="mt-3"
          productLocation={product.location}
          productLat={product.lat}
          productLng={product.lng}
          productCity={product.city}
          viewer={viewer}
          isOwner={false}
          ownerTrustScore={ownerProfile.trust_score}
        />
        {product.description ? (
          <p className="mt-4 text-sm leading-relaxed text-neutral-700">{product.description}</p>
        ) : null}
        <ProductSafetyHints
          aiValueStatus={product.ai_value_status}
          ownerTrustScore={ownerProfile.trust_score}
          className="mt-4"
        />
        <section className="mt-4 rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            İlan sahibi şunlarla ilgileniyor
          </p>
          <WantedTags
            categories={product.wanted_categories}
            keywords={product.wanted_keywords}
            className="mt-2"
          />
        </section>
        <SellerProfileCard
          profile={ownerProfile}
          viewerId={viewerId}
          isOwner={false}
          productId={product.id}
          className="mt-6"
        />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/offers/new?${new URLSearchParams({ requestedProductId: product.id }).toString()}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full border-0 bg-[#ff4f01] font-black text-white shadow-lg hover:bg-[#e64700]"
            )}
          >
            Takas teklif et
          </Link>
          <Link
            href="/discover"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full border-2 font-bold"
            )}
          >
            Keşfet
          </Link>
        </div>
      </div>
    </div>
  );
}
