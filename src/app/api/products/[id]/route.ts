import { NextResponse } from "next/server";

import { notifyFavoriteProductUnavailable } from "@/lib/server/notifications";
import { ownerValuePatchFields } from "@/lib/value-badge";
import { sanitizeOwnerProduct } from "@/lib/product-value";
import { normalizeWantedPrefs } from "@/lib/wanted";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductStatus } from "@/lib/types/product";

export const runtime = "nodejs";

const FORBIDDEN_DELETE = {
  error: "Ürün bulunamadı veya silme yetkin yok.",
} as const;

const FORBIDDEN_PATCH = {
  error: "Ürün bulunamadı veya düzenleme yetkin yok.",
} as const;

const ALLOWED_STATUSES: ProductStatus[] = ["available", "paused", "traded"];

function pickPatchBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const str = (k: string) => {
    if (typeof body[k] === "string") out[k] = body[k].trim();
  };
  str("title");
  str("description");
  str("category");
  str("condition");
  str("location");
  str("image_url");

  if (body.description === null) out.description = null;
  if (body.image_url === null) out.image_url = null;

  if (typeof body.status === "string") {
    const s = body.status.trim().toLowerCase();
    if (ALLOWED_STATUSES.includes(s as ProductStatus)) {
      out.status = s;
    }
  }

  if (typeof body.user_value === "number" && Number.isFinite(body.user_value) && body.user_value > 0) {
    out.user_value = body.user_value;
    out.estimated_price = body.user_value;
  }

  if (typeof body.estimated_price === "number" && !("user_value" in out)) {
    if (Number.isFinite(body.estimated_price) && body.estimated_price > 0) {
      out.estimated_price = body.estimated_price;
    }
  }

  const num = (k: string) => {
    if (body[k] === null) out[k] = null;
    else if (typeof body[k] === "number" && Number.isFinite(body[k])) out[k] = body[k];
  };
  num("ai_min_value");
  num("ai_max_value");
  num("ai_confidence");
  num("ai_value_deviation");

  if (typeof body.ai_value_status === "string") out.ai_value_status = body.ai_value_status;
  if (typeof body.ai_badge_label === "string") out.ai_badge_label = body.ai_badge_label;
  if (typeof body.ai_badge_color === "string") out.ai_badge_color = body.ai_badge_color;
  if (body.ai_uncertainty_reason === null) out.ai_uncertainty_reason = null;
  else if (typeof body.ai_uncertainty_reason === "string") {
    out.ai_uncertainty_reason = body.ai_uncertainty_reason.trim();
  }

  if (typeof out.location === "string") {
    out.city = out.location;
  }

  if (body.wanted_categories !== undefined) {
    const cats = Array.isArray(body.wanted_categories)
      ? body.wanted_categories.filter((x): x is string => typeof x === "string")
      : [];
    out.wanted_categories = normalizeWantedPrefs({ wanted_categories: cats }).wanted_categories;
  }

  if (body.wanted_keywords !== undefined) {
    const keys = Array.isArray(body.wanted_keywords)
      ? body.wanted_keywords.filter((x): x is string => typeof x === "string")
      : [];
    out.wanted_keywords = normalizeWantedPrefs({ wanted_keywords: keys }).wanted_keywords;
  }

  return out;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;
  if (!productId?.trim()) {
    return NextResponse.json({ error: "Eksik ürün kimliği." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const patch = pickPatchBody(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 });
  }

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const { data: beforeRow } = await supabase
    .from("products")
    .select("status, title")
    .eq("id", productId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (typeof patch.user_value === "number") {
    const { data: existing } = await supabase
      .from("products")
      .select("ai_min_value, ai_max_value, ai_confidence")
      .eq("id", productId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      const row = existing as {
        ai_min_value: number | null;
        ai_max_value: number | null;
        ai_confidence: number | null;
      };
      const badgeFields = ownerValuePatchFields(
        patch.user_value as number,
        row.ai_min_value,
        row.ai_max_value,
        row.ai_confidence
      );
      Object.assign(patch, badgeFields);
    }
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("owner_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[PATCH /api/products]", error.message);
    return NextResponse.json({ error: "Ürün güncellenemedi." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(FORBIDDEN_PATCH, { status: 404 });
  }

  const product = sanitizeOwnerProduct(data as Record<string, unknown>);

  const prevStatus = beforeRow ? String((beforeRow as { status: string }).status) : null;
  const nextStatus = String(product.status);
  if (
    prevStatus === "available" &&
    (nextStatus === "traded" ||
      nextStatus === "swapped" ||
      nextStatus === "paused" ||
      nextStatus === "hidden" ||
      nextStatus === "deleted")
  ) {
    void notifyFavoriteProductUnavailable(
      productId,
      String((beforeRow as { title: string }).title ?? product.title)
    );
  }

  return NextResponse.json({ success: true, product });
}

/**
 * Soft delete: set status = "deleted" for the current user's row only.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await ctx.params;
  if (!productId?.trim()) {
    return NextResponse.json({ error: "Eksik ürün kimliği." }, { status: 400 });
  }

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch (e) {
    console.error("[DELETE /api/products] supabase init", e);
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.warn("[DELETE /api/products] auth.getUser", authErr.message);
  }

  if (!user) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  console.log("[DELETE /api/products] request", {
    productId,
    currentUserId: user.id,
  });

  const { data, error } = await supabase
    .from("products")
    .update({ status: "deleted" })
    .eq("id", productId)
    .eq("owner_id", user.id)
    .select("id, status, title")
    .maybeSingle();

  if (error) {
    console.error("[DELETE /api/products] supabase update error", {
      productId,
      currentUserId: user.id,
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Ürün silinirken bir hata oluştu." },
      { status: 500 }
    );
  }

  if (!data || data.status !== "deleted") {
    console.warn("[DELETE /api/products] no row updated or unexpected status", {
      productId,
      currentUserId: user.id,
      returned: data,
    });
    return NextResponse.json(FORBIDDEN_DELETE, { status: 404 });
  }

  void notifyFavoriteProductUnavailable(
    productId,
    String((data as { title?: string }).title ?? "İlan")
  );

  return NextResponse.json({ success: true });
}
