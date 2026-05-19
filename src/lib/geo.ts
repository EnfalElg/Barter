/** WGS84 point for distance / proximity checks. */
export type GeoPoint = {
  lat: number | null;
  lng: number | null;
};

/** Viewer context — never expose raw coords in the UI. */
export type ViewerLocation = GeoPoint & {
  /** Selected district/city label, e.g. "Ankara / Çankaya". */
  location: string | null;
};

export type GeoItem = GeoPoint & {
  location?: string | null;
  city?: string | null;
};

export type ProximityBand = "walking" | "nearby" | "far";

export type ProximityFilter = ProximityBand | "same_area";

export type LocationProximityKind = ProximityBand | "same_area";

export type LocationProximityBadge = {
  kind: LocationProximityKind;
  label: string;
  icon: string;
  tone: "green" | "amber" | "gray" | "violet";
};

const EARTH_RADIUS_KM = 6371;

const WALKING_MAX_KM = 1.5;
const NEARBY_MAX_KM = 5;

/** Approximate center per Keşfet district — viewer anchor only, not product coords. */
const VIEWER_AREA_ANCHORS: Record<string, { lat: number; lng: number }> = {
  "Ankara / Çankaya": { lat: 39.9179, lng: 32.8627 },
  "Ankara / Bahçelievler": { lat: 39.9208, lng: 32.8251 },
  "İstanbul / Kadıköy": { lat: 40.9819, lng: 29.0576 },
  "İstanbul / Beşiktaş": { lat: 41.0422, lng: 29.0083 },
  "İzmir / Bornova": { lat: 38.4633, lng: 27.2178 },
  "Bursa / Nilüfer": { lat: 40.221, lng: 28.985 },
  "Eskişehir / Tepebaşı": { lat: 39.7767, lng: 30.5206 },
  "Antalya / Muratpaşa": { lat: 36.8841, lng: 30.7056 },
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in kilometers between two WGS84 points. */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** @deprecated Use {@link calculateDistanceKm}. */
export const haversineKm = calculateDistanceKm;

export function isValidGeoCoord(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

export function normalizeLocationText(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLocaleLowerCase("tr-TR");
}

/** True when two location labels refer to the same district/city string. */
export function locationsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeLocationText(a);
  const nb = normalizeLocationText(b);
  return na.length > 0 && nb.length > 0 && na === nb;
}

export function proximityBandFromKm(km: number): ProximityBand {
  if (km <= WALKING_MAX_KM) return "walking";
  if (km <= NEARBY_MAX_KM) return "nearby";
  return "far";
}

function badgeForBand(band: ProximityBand): LocationProximityBadge {
  switch (band) {
    case "walking":
      return {
        kind: "walking",
        label: "Yürüme mesafesinde",
        icon: "🚶",
        tone: "green",
      };
    case "nearby":
      return {
        kind: "nearby",
        label: "Yakında",
        icon: "📍",
        tone: "amber",
      };
    case "far":
      return {
        kind: "far",
        label: "Uzakta",
        icon: "🚚",
        tone: "gray",
      };
  }
}

const SAME_AREA_BADGE: LocationProximityBadge = {
  kind: "same_area",
  label: "Yakın bölgede",
  icon: "📍",
  tone: "violet",
};

/**
 * Qualitative proximity badge for a product relative to the viewer.
 * - With valid coords on both sides: walking / nearby / far (no exact km in UI).
 * - Text-only: same-area badge when location strings match.
 */
export function getLocationProximityBadge(
  viewer: ViewerLocation,
  item: GeoItem
): LocationProximityBadge | null {
  const viewerCoords = coordsForDistance(viewer, { allowLocationAnchor: true });
  const itemCoords = coordsForDistance(item);

  if (viewerCoords && itemCoords) {
    const km = calculateDistanceKm(
      viewerCoords.lat,
      viewerCoords.lng,
      itemCoords.lat,
      itemCoords.lng
    );
    return badgeForBand(proximityBandFromKm(km));
  }

  const viewerArea = viewer.location?.trim() || null;
  const itemArea = item.location?.trim() || item.city?.trim() || null;
  if (viewerArea && locationsMatch(viewerArea, itemArea)) {
    return SAME_AREA_BADGE;
  }

  return null;
}

/** Coords used only for distance math — never rendered. */
export function coordsForDistance(
  point: GeoPoint & { location?: string | null },
  options?: { allowLocationAnchor?: boolean }
): { lat: number; lng: number } | null {
  if (isValidGeoCoord(point.lat, point.lng)) {
    return { lat: point.lat!, lng: point.lng! };
  }
  if (options?.allowLocationAnchor) {
    const key = point.location?.trim();
    if (key && VIEWER_AREA_ANCHORS[key]) {
      return VIEWER_AREA_ANCHORS[key];
    }
  }
  return null;
}

export function productMatchesProximityFilter(
  product: GeoItem & { location?: string | null },
  viewer: ViewerLocation,
  filter: ProximityFilter
): boolean {
  if (filter === "same_area") {
    const viewerArea = viewer.location?.trim() || null;
    const itemArea = product.location?.trim() || product.city?.trim() || null;
    return Boolean(viewerArea && locationsMatch(viewerArea, itemArea));
  }

  const viewerCoords = coordsForDistance(viewer, { allowLocationAnchor: true });
  const itemCoords = coordsForDistance(product);
  if (!viewerCoords || !itemCoords) return false;

  const km = calculateDistanceKm(
    viewerCoords.lat,
    viewerCoords.lng,
    itemCoords.lat,
    itemCoords.lng
  );

  if (filter === "walking") return km <= WALKING_MAX_KM;
  if (filter === "nearby") return km <= NEARBY_MAX_KM;
  return false;
}

export const EXPLORE_PROXIMITY_FILTER_OPTIONS = [
  { value: "walking", label: "Yürüme mesafesinde" },
  { value: "nearby", label: "Yakında" },
  { value: "same_area", label: "Aynı ilçe" },
] as const;

/** @deprecated Use {@link getLocationProximityBadge}. */
export function getLocationBadge(
  viewer: { lat: number | null; lng: number | null; city: string | null },
  item: { lat: number | null; lng: number | null; city: string | null }
): { kind: "walking" | "same_city"; labelTr: string; labelEn: string } | null {
  const badge = getLocationProximityBadge(
    { lat: viewer.lat, lng: viewer.lng, location: viewer.city },
    { lat: item.lat, lng: item.lng, location: null, city: item.city }
  );
  if (!badge) return null;
  if (badge.kind === "walking") {
    return {
      kind: "walking",
      labelTr: badge.label,
      labelEn: "Walking distance",
    };
  }
  if (badge.kind === "same_area") {
    return {
      kind: "same_city",
      labelTr: badge.label,
      labelEn: "Same area",
    };
  }
  return null;
}
