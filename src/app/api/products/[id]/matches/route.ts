import { NextResponse } from "next/server";

import { computeProductMatches } from "@/lib/product-matches";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const rangeRaw = url.searchParams.get("range");
  const rangePct = rangeRaw != null ? Number(rangeRaw) : 10;

  const supabase = await createServerSupabaseClient();
  const result = await computeProductMatches(supabase, id, rangePct);

  if (!result.ok) {
    if (result.error === "unauthorized") {
      return NextResponse.json({ error: "auth required" }, { status: 401 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json(
        { error: "Bu ürün için denk takasları görüntüleyemezsin." },
        { status: 403 }
      );
    }
    if (result.error === "not_found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (result.error === "bad_request") {
      return NextResponse.json(
        { error: result.message ?? "Bu ürün için değer bilgisi bulunamadı." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: result.message ?? "match query failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    selected_product_id: result.selected_product_id,
    range: result.range,
    matches: result.matches,
  });
}
