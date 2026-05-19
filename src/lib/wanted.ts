/** Shared wanted-category / wishlist helpers (public-safe fields only in UI). */

export const WANTED_CATEGORY_OPTIONS = [
  "Elektronik",
  "Ev & Yaşam",
  "Kitap & Hobi",
  "Spor",
  "Giyim",
  "Oyun & Konsol",
  "Müzik",
  "Kamp & Outdoor",
  "Kahve & Mutfak",
  "Diğer",
] as const;

export const MAX_WANTED_CATEGORIES = 10;
export const MAX_WANTED_KEYWORDS = 20;
export const MAX_WANTED_KEYWORD_LENGTH = 40;

export type WantedPrefs = {
  wanted_categories: string[];
  wanted_keywords: string[];
};

export function parseWantedArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function normalizeWantedCategories(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_WANTED_CATEGORIES) break;
  }
  return out;
}

export function normalizeWantedKeywords(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    const t = item.trim().slice(0, MAX_WANTED_KEYWORD_LENGTH);
    if (!t) continue;
    const key = t.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_WANTED_KEYWORDS) break;
  }
  return out;
}

export function normalizeWantedPrefs(raw: {
  wanted_categories?: unknown;
  wanted_keywords?: unknown;
}): WantedPrefs {
  const cats = normalizeWantedCategories(
    parseWantedArray(raw.wanted_categories).map(String)
  );
  const keys = normalizeWantedKeywords(parseWantedArray(raw.wanted_keywords).map(String));
  return { wanted_categories: cats, wanted_keywords: keys };
}

export function wantedPrefsFromRow(row: Record<string, unknown>): WantedPrefs {
  return normalizeWantedPrefs({
    wanted_categories: row.wanted_categories,
    wanted_keywords: row.wanted_keywords,
  });
}

export function mergeWantedPrefs(...sources: WantedPrefs[]): WantedPrefs {
  const cats: string[] = [];
  const keys: string[] = [];
  for (const s of sources) {
    cats.push(...s.wanted_categories);
    keys.push(...s.wanted_keywords);
  }
  return {
    wanted_categories: normalizeWantedCategories(cats),
    wanted_keywords: normalizeWantedKeywords(keys),
  };
}

export function collectWantedFromProducts(
  products: Array<{ wanted_categories?: string[]; wanted_keywords?: string[] }>
): WantedPrefs {
  return mergeWantedPrefs(
    ...products.map((p) => ({
      wanted_categories: p.wanted_categories ?? [],
      wanted_keywords: p.wanted_keywords ?? [],
    }))
  );
}

function haystack(text: string, description: string | null | undefined): string {
  return `${text} ${description ?? ""}`.toLocaleLowerCase("tr-TR");
}

export function keywordMatchesHaystack(
  keywords: string[],
  title: string,
  description: string | null | undefined
): boolean {
  if (keywords.length === 0) return false;
  const h = haystack(title, description);
  return keywords.some((kw) => h.includes(kw.toLocaleLowerCase("tr-TR")));
}

export type WishFitResult = {
  points: number;
  productCategoryMatch: boolean;
  productKeywordMatch: boolean;
  profileCategoryMatch: boolean;
  profileKeywordMatch: boolean;
};

/** Max 25 points — product-level prefs beat profile fallback in scoring. */
export function wishFitPoints(
  candidate: { category: string; title: string; description: string | null },
  productWanted: WantedPrefs,
  profileWanted?: WantedPrefs | null
): WishFitResult {
  let points = 0;
  let productCategoryMatch = false;
  let productKeywordMatch = false;
  let profileCategoryMatch = false;
  let profileKeywordMatch = false;

  const cat = candidate.category.trim();

  if (productWanted.wanted_categories.includes(cat)) {
    points += 15;
    productCategoryMatch = true;
  }

  if (keywordMatchesHaystack(productWanted.wanted_keywords, candidate.title, candidate.description)) {
    points += 10;
    productKeywordMatch = true;
  }

  const profile = profileWanted ?? { wanted_categories: [], wanted_keywords: [] };

  if (!productCategoryMatch && profile.wanted_categories.includes(cat)) {
    points += 8;
    profileCategoryMatch = true;
  }

  if (
    !productKeywordMatch &&
    keywordMatchesHaystack(profile.wanted_keywords, candidate.title, candidate.description)
  ) {
    points += 6;
    profileKeywordMatch = true;
  }

  return {
    points: Math.min(25, points),
    productCategoryMatch,
    productKeywordMatch,
    profileCategoryMatch,
    profileKeywordMatch,
  };
}

export type BundleWishLabels = {
  wish_category_label: string | null;
  wish_keyword_label: string | null;
};

export function bundleWishLabels(
  candidate: { category: string; title: string; description: string | null },
  aggregatedWanted: WantedPrefs
): BundleWishLabels {
  const cat = candidate.category.trim();
  let wish_category_label: string | null = null;
  let wish_keyword_label: string | null = null;

  if (aggregatedWanted.wanted_categories.length > 0 && aggregatedWanted.wanted_categories.includes(cat)) {
    wish_category_label = "İsteklerine uygun";
  }

  if (
    aggregatedWanted.wanted_keywords.length > 0 &&
    keywordMatchesHaystack(aggregatedWanted.wanted_keywords, candidate.title, candidate.description)
  ) {
    wish_keyword_label = "Aradığın ürün olabilir";
  }

  return { wish_category_label, wish_keyword_label };
}

export function offerWishCompatibility(
  offeredCategories: string[],
  ownerWanted: WantedPrefs
): { matches: boolean; message: string } | null {
  if (
    ownerWanted.wanted_categories.length === 0 &&
    ownerWanted.wanted_keywords.length === 0
  ) {
    return null;
  }

  const matches = offeredCategories.some((c) => ownerWanted.wanted_categories.includes(c.trim()));

  if (matches) {
    return {
      matches: true,
      message: "Teklifin, ilan sahibinin aradığı kategorilerle uyumlu.",
    };
  }

  return {
    matches: false,
    message:
      "İlan sahibinin belirttiği tercihlerle tam eşleşmiyor, yine de teklif gönderebilirsin.",
  };
}

export function hasWantedPrefs(prefs: WantedPrefs): boolean {
  return prefs.wanted_categories.length > 0 || prefs.wanted_keywords.length > 0;
}
