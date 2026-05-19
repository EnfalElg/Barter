import { MOCK_PRODUCT_MATCH_SOURCES } from "@/data/mock-products";
import {
  productMatchesProximityFilter,
  type ProximityFilter,
  type ViewerLocation,
} from "@/lib/geo";
import {
  getLocationHint,
  matchesLocationHintFilter,
  type LocationHintFilter,
} from "@/lib/location-utils";
import {
  sanitizePublicProduct,
  stripPrivateMatchSource,
} from "@/lib/product-value";
import {
  EXPLORE_AI_STATUS_OPTIONS,
  EXPLORE_CATEGORY_OPTIONS,
  EXPLORE_CONDITION_OPTIONS,
  EXPLORE_LOCATION_OPTIONS,
  EXPLORE_PUBLIC_COLUMNS,
} from "@/lib/explore-constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicProduct } from "@/lib/types/product";

export {
  EXPLORE_AI_STATUS_OPTIONS,
  EXPLORE_CATEGORY_OPTIONS,
  EXPLORE_CONDITION_OPTIONS,
  EXPLORE_LOCATION_OPTIONS,
  EXPLORE_PUBLIC_COLUMNS,
};

export type ExploreFilters = {
  category?: string;
  location?: string;
  condition?: string;
  ai_value_status?: string;
  search?: string;
  proximity?: ProximityFilter;
  location_hint?: LocationHintFilter;
};

export { EXPLORE_PROXIMITY_FILTER_OPTIONS } from "@/lib/geo";
export { LOCATION_HINT_FILTER_OPTIONS } from "@/lib/location-utils";

function applyLocationHintFilter(
  rows: PublicProduct[],
  viewer: ViewerLocation | null,
  filter?: LocationHintFilter
): PublicProduct[] {
  if (!filter || !viewer?.location?.trim()) return rows;
  return rows.filter((p) => {
    const hint = getLocationHint({
      userLocationText: viewer.location,
      productLocationText: p.location || p.city,
      userLat: viewer.lat,
      userLng: viewer.lng,
      productLat: p.lat,
      productLng: p.lng,
    });
    return matchesLocationHintFilter(hint, filter);
  });
}

function applyProximityFilter(
  rows: PublicProduct[],
  viewer: ViewerLocation | null,
  proximity?: ProximityFilter
): PublicProduct[] {
  if (!proximity?.trim() || !viewer) return rows;
  return rows.filter((p) =>
    productMatchesProximityFilter(
      {
        lat: p.lat,
        lng: p.lng,
        location: p.location,
        city: p.city,
      },
      viewer,
      proximity
    )
  );
}

function mockExplore(
  viewerUserId: string | null,
  filters: ExploreFilters,
  viewer: ViewerLocation | null
): PublicProduct[] {
  let rows = MOCK_PRODUCT_MATCH_SOURCES.map((p) => stripPrivateMatchSource(p));
  if (viewerUserId) {
    rows = rows.filter((p) => p.owner_id !== viewerUserId);
  }
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filters.category?.trim()) {
    rows = rows.filter((p) => p.category === filters.category!.trim());
  }
  if (filters.location?.trim()) {
    rows = rows.filter((p) => p.location === filters.location!.trim());
  }
  if (filters.condition?.trim()) {
    rows = rows.filter((p) => p.condition === filters.condition!.trim());
  }
  if (filters.ai_value_status?.trim()) {
    rows = rows.filter((p) => p.ai_value_status === filters.ai_value_status!.trim());
  }
  rows = applyProximityFilter(rows, viewer, filters.proximity);
  rows = applyLocationHintFilter(rows, viewer, filters.location_hint);
  return rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Keşfet: tüm yayında ürünler; giriş yapılmışsa kendi ilanları hariç.
 * Filtreler isteğe bağlı. user_value asla dönmez.
 */
export async function fetchExploreProducts(params: {
  viewerUserId: string | null;
  filters: ExploreFilters;
  viewer?: ViewerLocation | null;
}): Promise<PublicProduct[]> {
  const { viewerUserId, filters, viewer = null } = params;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return mockExplore(viewerUserId, filters, viewer);
  }

  try {
    const supabase = await createServerSupabaseClient();
    let q = supabase
      .from("products")
      .select(EXPLORE_PUBLIC_COLUMNS)
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (viewerUserId) {
      q = q.neq("owner_id", viewerUserId);
    }

    if (filters.category?.trim()) {
      q = q.eq("category", filters.category.trim());
    }
    if (filters.location?.trim()) {
      q = q.eq("location", filters.location.trim());
    }
    if (filters.condition?.trim()) {
      q = q.eq("condition", filters.condition.trim());
    }
    if (filters.ai_value_status?.trim()) {
      q = q.eq("ai_value_status", filters.ai_value_status.trim());
    }
    if (filters.search?.trim()) {
      const raw = filters.search.trim().replace(/%/g, "\\%");
      q = q.ilike("title", `%${raw}%`);
    }

    const { data, error } = await q;
    if (error) {
      console.warn("[explore]", error.message);
      return mockExplore(viewerUserId, filters, viewer);
    }
    let rows = (data ?? []).map((row) =>
      sanitizePublicProduct(row as Record<string, unknown>)
    );
    rows = applyProximityFilter(rows, viewer, filters.proximity);
    return applyLocationHintFilter(rows, viewer, filters.location_hint);
  } catch {
    return mockExplore(viewerUserId, filters, viewer);
  }
}

/** Giriş yapmış kullanıcının Keşfet bundle seçicisi için (sayısal alan yok). */
export async function fetchOwnAvailableProductsForBundle(
  ownerId: string
): Promise<PublicProduct[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select(EXPLORE_PUBLIC_COLUMNS)
      .eq("owner_id", ownerId)
      .eq("status", "available")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[explore own]", error.message);
      return [];
    }
    return (data ?? []).map((row) =>
      sanitizePublicProduct(row as Record<string, unknown>)
    );
  } catch {
    return [];
  }
}
