/** Shared Keşfet / konum sabitleri — client-safe (no server imports). */

export const EXPLORE_PUBLIC_COLUMNS =
  "id, owner_id, title, description, category, condition, image_url, location, status, ai_value_status, ai_badge_label, ai_badge_color, created_at, lat, lng, city, tags, quantity, unit, wanted_categories, wanted_keywords";

export const EXPLORE_CATEGORY_OPTIONS = [
  "Elektronik",
  "Ev & Yaşam",
  "Kitap & Hobi",
  "Spor",
  "Giyim",
  "Oyun & Konsol",
  "Müzik",
  "Kamp & Outdoor",
] as const;

export const EXPLORE_LOCATION_OPTIONS = [
  "Ankara / Çankaya",
  "Ankara / Bahçelievler",
  "İstanbul / Kadıköy",
  "İstanbul / Beşiktaş",
  "İzmir / Bornova",
  "Bursa / Nilüfer",
  "Eskişehir / Tepebaşı",
  "Antalya / Muratpaşa",
] as const;

export const EXPLORE_CONDITION_OPTIONS = [
  "Yeni / kapalı kutu",
  "Az kullanılmış",
  "İyi",
  "Yıpranmış",
] as const;

export const EXPLORE_AI_STATUS_OPTIONS = [
  "fair",
  "slightly_low",
  "very_low",
  "slightly_high",
  "very_high",
  "unknown",
] as const;
