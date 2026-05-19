import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductEditClient } from "@/app/products/[id]/edit/product-edit-client";
import { buttonVariants } from "@/components/ui/button";
import { sanitizeOwnerProduct } from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Ürünü Düzenle",
};

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/products/${id}/edit`)}`);
  }

  const { data: row, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-black text-neutral-900">Ürün bulunamadı</h1>
        <Link href="/profile" className={cn(buttonVariants({ className: "mt-6" }))}>
          Profilime dön
        </Link>
      </div>
    );
  }

  const rec = row as Record<string, unknown>;
  if (String(rec.owner_id) !== user.id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-black text-neutral-900">
          Bu ürünü düzenleme yetkin yok.
        </h1>
        <Link href="/profile" className={cn(buttonVariants({ className: "mt-6" }))}>
          Profilime dön
        </Link>
      </div>
    );
  }

  const status = String(rec.status ?? "").toLowerCase();
  if (status === "deleted") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-black text-neutral-900">Ürün bulunamadı</h1>
        <p className="mt-2 text-sm text-neutral-600">Bu ürün silinmiş.</p>
        <Link href="/profile" className={cn(buttonVariants({ className: "mt-6" }))}>
          Profilime dön
        </Link>
      </div>
    );
  }

  const product = sanitizeOwnerProduct(rec);

  return <ProductEditClient product={product} />;
}
