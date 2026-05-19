import { LocationBadge } from "@/components/location-badge";
import { getLocationHint } from "@/lib/location-utils";
import type { GeoItem, ViewerLocation } from "@/lib/geo";
import { cn } from "@/lib/utils";

export type ProductLocationDisplayProps = {
  locationLabel: string;
  product: GeoItem;
  viewer: ViewerLocation;
  className?: string;
};

export function ProductLocationDisplay({
  locationLabel,
  product,
  viewer,
  className,
}: ProductLocationDisplayProps) {
  const productText = product.location?.trim() || product.city?.trim() || null;

  const hint = viewer.location
    ? getLocationHint({
        userLocationText: viewer.location,
        productLocationText: productText,
        userLat: viewer.lat,
        userLng: viewer.lng,
        productLat: product.lat,
        productLng: product.lng,
      })
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm text-neutral-600">📍 {locationLabel}</p>
      {hint && hint.level !== "unknown" ? (
        <LocationBadge hint={hint} size="sm" />
      ) : null}
    </div>
  );
}
