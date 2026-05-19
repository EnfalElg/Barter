import { LocationBadge } from "@/components/location-badge";
import { SafeMeetingPanel } from "@/components/safe-meeting-panel";
import {
  getLocationHint,
  type LocationHint,
  tradeLocationMessage,
} from "@/lib/location-utils";
import { getMeetingSuggestions, trustRiskFromScore } from "@/lib/meeting-suggestions";
import type { ViewerLocation } from "@/lib/geo";
import { cn } from "@/lib/utils";

export type ProductDetailLocationProps = {
  productLocation: string;
  productLat?: number | null;
  productLng?: number | null;
  productCity?: string | null;
  viewer: ViewerLocation;
  isOwner: boolean;
  ownerTrustScore?: number;
  className?: string;
};

export function ProductDetailLocation({
  productLocation,
  productLat,
  productLng,
  productCity,
  viewer,
  isOwner,
  ownerTrustScore,
  className,
}: ProductDetailLocationProps) {
  const hint: LocationHint | null = viewer.location
    ? getLocationHint({
        userLocationText: viewer.location,
        productLocationText: productLocation || productCity,
        userLat: viewer.lat,
        userLng: viewer.lng,
        productLat: productLat ?? null,
        productLng: productLng ?? null,
      })
    : null;

  const tradeMsg = hint && !isOwner ? tradeLocationMessage(hint) : null;

  const suggestions = getMeetingSuggestions({
    locationHintLevel: hint?.level,
    sameCity: hint?.level === "same_city" || hint?.level === "same_area",
    trustRiskLevel:
      ownerTrustScore != null ? trustRiskFromScore(ownerTrustScore) : "unknown",
  });

  return (
    <div className={cn("space-y-4", className)}>
      <section className="rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          {isOwner ? "Bu ilanın konumu" : "Konum"}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-800">📍 {productLocation}</p>
        {!isOwner && hint && hint.level !== "unknown" ? (
          <div className="mt-2">
            <LocationBadge hint={hint} size="md" />
          </div>
        ) : null}
        {tradeMsg ? (
          <p className="mt-2 text-sm font-semibold text-neutral-700">{tradeMsg}</p>
        ) : null}
      </section>
      <SafeMeetingPanel suggestions={suggestions} />
    </div>
  );
}
