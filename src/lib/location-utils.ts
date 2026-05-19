import { calculateDistanceKm as geoDistanceKm, isValidGeoCoord } from "@/lib/geo";

export type LocationDistanceLabel =
  | "walking"
  | "nearby"
  | "same_area"
  | "same_city"
  | "far"
  | "unknown";

export type LocationHintColor = "green" | "yellow" | "orange" | "gray";

export type LocationHint = {
  label: string;
  icon: string;
  color: LocationHintColor;
  level: LocationDistanceLabel;
};

export type LocationHintInput = {
  userLocationText?: string | null;
  productLocationText?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  productLat?: number | null;
  productLng?: number | null;
};

export type LocationHintFilter = "same_area" | "same_city" | "far";

const WALKING_MAX_KM = 1.5;
const NEARBY_MAX_KM = 5;

export function parseCity(location?: string | null): string | null {
  if (!location?.trim()) return null;
  const part = location.split("/")[0]?.trim();
  return part || null;
}

export function parseDistrict(location?: string | null): string | null {
  if (!location?.trim()) return null;
  const parts = location.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1] ?? null;
}

function normalizeLoc(s: string | null | undefined): string {
  return (s ?? "").trim().toLocaleLowerCase("tr-TR");
}

/** Haversine distance in km (WGS84). */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return geoDistanceKm(lat1, lon1, lat2, lon2);
}

function hintWalking(): LocationHint {
  return { level: "walking", label: "Yürüme mesafesinde", icon: "🚶", color: "green" };
}

function hintNearby(): LocationHint {
  return { level: "nearby", label: "Yakında", icon: "📍", color: "yellow" };
}

function hintFar(): LocationHint {
  return { level: "far", label: "Kargo gerekebilir", icon: "🚚", color: "gray" };
}

function hintSameArea(): LocationHint {
  return { level: "same_area", label: "Yakın bölgede", icon: "📍", color: "green" };
}

function hintSameCity(): LocationHint {
  return { level: "same_city", label: "Aynı şehirde", icon: "🏙️", color: "yellow" };
}

function hintUnknown(): LocationHint {
  return { level: "unknown", label: "Konum belirsiz", icon: "❔", color: "gray" };
}

export function getLocationHint(input: LocationHintInput): LocationHint {
  const userLat = input.userLat;
  const userLng = input.userLng;
  const productLat = input.productLat;
  const productLng = input.productLng;

  if (
    isValidGeoCoord(userLat, userLng) &&
    isValidGeoCoord(productLat, productLng)
  ) {
    const km = calculateDistanceKm(userLat!, userLng!, productLat!, productLng!);
    if (km <= WALKING_MAX_KM) return hintWalking();
    if (km <= NEARBY_MAX_KM) return hintNearby();
    return hintFar();
  }

  const userText = input.userLocationText?.trim() ?? "";
  const productText = input.productLocationText?.trim() ?? "";

  if (!userText || !productText) {
    return hintUnknown();
  }

  const userNorm = normalizeLoc(userText);
  const productNorm = normalizeLoc(productText);

  if (userNorm === productNorm) {
    return hintSameArea();
  }

  const userCity = parseCity(userText);
  const productCity = parseCity(productText);
  const userDistrict = parseDistrict(userText);
  const productDistrict = parseDistrict(productText);

  if (
    userCity &&
    productCity &&
    normalizeLoc(userCity) === normalizeLoc(productCity) &&
    userDistrict &&
    productDistrict &&
    normalizeLoc(userDistrict) === normalizeLoc(productDistrict)
  ) {
    return hintSameArea();
  }

  if (
    userCity &&
    productCity &&
    normalizeLoc(userCity) === normalizeLoc(productCity)
  ) {
    return hintSameCity();
  }

  return hintFar();
}

/** Qualitative reason line for recommendations (no km). */
export function locationReasonFromHint(hint: LocationHint): string | null {
  switch (hint.level) {
    case "same_area":
    case "walking":
    case "nearby":
      return "Yakın bölgede görünüyor.";
    case "same_city":
      return "Aynı şehirde.";
    case "far":
      return "Kargo gerekebilir.";
    default:
      return null;
  }
}

export function tradeLocationMessage(hint: LocationHint): string | null {
  if (
    hint.level === "walking" ||
    hint.level === "nearby" ||
    hint.level === "same_area" ||
    hint.level === "same_city"
  ) {
    return "Yüz yüze takas uygun görünüyor.";
  }
  if (hint.level === "far") {
    return "Kargo veya aracı teslimat gerekebilir.";
  }
  return null;
}

export function matchesLocationHintFilter(
  hint: LocationHint,
  filter: LocationHintFilter
): boolean {
  switch (filter) {
    case "same_area":
      return (
        hint.level === "same_area" ||
        hint.level === "walking" ||
        hint.level === "nearby"
      );
    case "same_city":
      return (
        hint.level === "same_city" ||
        hint.level === "same_area" ||
        hint.level === "walking" ||
        hint.level === "nearby"
      );
    case "far":
      return hint.level === "far";
    default:
      return true;
  }
}

export const LOCATION_HINT_FILTER_OPTIONS = [
  { value: "same_area" as const, label: "Yakın bölgede" },
  { value: "same_city" as const, label: "Aynı şehirde" },
  { value: "far" as const, label: "Kargo gerekebilir" },
] as const;
