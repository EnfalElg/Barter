import Link from "next/link";
import { redirect } from "next/navigation";

import { OfferNewClient } from "@/app/offers/new/offer-new-client";
import { buttonVariants } from "@/components/ui/button";
import { loadOfferNewPageData } from "@/lib/offer-new.server";
import { fetchProfileLocationContext } from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildViewerLocation } from "@/lib/viewer-location";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Takas Teklifi",
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function OfferNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requestedProductId = firstString(sp.requestedProductId)?.trim();
  if (!requestedProductId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-600">
        <p>Takas için bir hedef ürün seçmelisin.</p>
        <Link href="/discover" className={cn(buttonVariants({ className: "mt-6" }))}>
          Keşfet
        </Link>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/offers/new?requestedProductId=${encodeURIComponent(requestedProductId)}`)}`
    );
  }

  const data = await loadOfferNewPageData(requestedProductId, user.id);
  if (!data.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-600">
        <p>
          {data.reason === "own_product"
            ? "Kendi ürününe takas teklifi gönderemezsin."
            : "Takas istenen ürün bulunamadı."}
        </p>
        <Link href="/discover" className={cn(buttonVariants({ className: "mt-6" }))}>
          Keşfet
        </Link>
      </div>
    );
  }

  const offeredRaw = firstString(sp.offeredProductIds)?.trim();
  const initialOfferedIds = offeredRaw
    ? offeredRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const locCtx = await fetchProfileLocationContext(user.id);
  const viewer = buildViewerLocation({
    profileLocation: locCtx.location,
    lat: locCtx.lat,
    lng: locCtx.lng,
  });

  return (
    <OfferNewClient
      requested={data.requested}
      mine={data.mine}
      initialOfferedIds={initialOfferedIds}
      viewer={viewer}
      ownerWanted={data.ownerWanted}
    />
  );
}
