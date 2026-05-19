import type { ViewerLocation } from "@/lib/geo";

/** Build viewer context for proximity badges and filters (no coords in UI). */
export function buildViewerLocation(params: {
  selectedLocation?: string | null;
  profileLocation?: string | null;
  lat?: number | null;
  lng?: number | null;
}): ViewerLocation {
  const selected = params.selectedLocation?.trim();
  const profile = params.profileLocation?.trim();
  return {
    lat: params.lat ?? null,
    lng: params.lng ?? null,
    location: selected || profile || null,
  };
}
