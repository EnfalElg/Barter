"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { AiUncertaintyHelp } from "@/components/ai-uncertainty-help";
import { PrivateValueNote } from "@/components/private-value-note";
import { ProductStatusBadge } from "@/components/product-status-badge";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { BARTER_VALUE_HIDDEN_OWNER } from "@/lib/barter-copy";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OwnerProduct } from "@/lib/types/product";
import { cn } from "@/lib/utils";

import { Camera, Loader2, Trash2 } from "lucide-react";

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Feedback =
  | null
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export type ProfileProductListProps = {
  initialProducts: OwnerProduct[];
};

export function ProfileProductList({
  initialProducts,
}: ProfileProductListProps) {
  const router = useRouter();
  const [products, setProducts] = useState<OwnerProduct[]>(initialProducts);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!feedback || feedback.kind !== "success") return;
    const t = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(t);
  }, [feedback]);

  async function handleDelete(productId: string) {
    const ok = window.confirm(
      "Bu ürünü silmek istediğine emin misin?"
    );
    if (!ok) return;

    setDeletingId(productId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !body.success) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setFeedback({ kind: "success", message: "Ürün silindi." });
      router.refresh();
    } catch {
      setFeedback({
        kind: "error",
        message: "Ürün silinirken bir hata oluştu.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-black text-neutral-900">
        Yayınladığım Ürünler
      </h2>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "mb-4 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1",
            feedback.kind === "success" &&
              "bg-emerald-50 text-emerald-900 ring-emerald-100",
            feedback.kind === "error" && "bg-red-50 text-red-800 ring-red-100"
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title="Henüz ürün yayınlamadın."
          description="Elindeki bir ürünü ekleyerek denk takasları keşfet."
          actionLabel="Ürün Ekle"
          actionHref="/post"
        />
      ) : (
        <ul className="flex list-none flex-col gap-5 p-0">
          {products.map((product) => {
            const badge = fallbackBadgeLabel(
              product.ai_badge_label,
              product.ai_badge_color
            );
            const min = product.ai_min_value;
            const max = product.ai_max_value;
            const hasRange =
              min != null &&
              max != null &&
              Number.isFinite(min) &&
              Number.isFinite(max) &&
              min >= 0 &&
              max >= 0;
            const isDeleting = deletingId === product.id;

            return (
              <li key={product.id}>
                <article
                  className={cn(
                    "flex flex-col overflow-hidden rounded-2xl border border-[#fde8dc]/90 bg-white shadow-[0_8px_28px_-8px_rgba(255,79,1,0.12)] ring-1 ring-black/[0.03]"
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5">
                    <div className="relative mx-auto aspect-square w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:mx-0 sm:size-36">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-400">
                          <Camera className="size-10" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-black leading-snug text-neutral-900">
                          {product.title}
                        </h3>
                        <ProductStatusBadge status={product.status} className="shrink-0" />
                      </div>
                      <p className="text-xs text-neutral-500">
                        {formatCreatedAt(product.created_at)}
                      </p>
                      <p className="text-sm text-neutral-700">
                        <span className="text-neutral-500">Kategori:</span>{" "}
                        {product.category}
                      </p>
                      <p className="text-sm text-neutral-700">
                        <span className="text-neutral-500">Durum:</span>{" "}
                        {product.condition}
                      </p>
                      <p className="text-sm text-neutral-700">
                        <span className="text-neutral-500">Konum:</span>{" "}
                        {product.location}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900">
                        Benim biçtiğim değer:{" "}
                        {Math.round(product.user_value).toLocaleString("tr-TR")} TL
                      </p>
                      <PrivateValueNote variant="compact" className="mt-1" />
                      <p className="text-[11px] font-semibold text-neutral-500">
                        {BARTER_VALUE_HIDDEN_OWNER}
                      </p>
                      {hasRange ? (
                        <p className="text-sm text-neutral-700">
                          AI tahmini aralık:{" "}
                          {Math.round(min!).toLocaleString("tr-TR")} –{" "}
                          {Math.round(max!).toLocaleString("tr-TR")} TL
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <ValueBadge label={badge.label} color={badge.color} size="md" />
                      </div>
                      {product.ai_value_status === "unknown" ? (
                        <AiUncertaintyHelp
                          reason={product.ai_uncertainty_reason}
                          className="mt-2"
                        />
                      ) : null}
                      <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:flex-wrap">
                        <Link
                          href={`/products/${product.id}/matches`}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "rounded-full border-0 bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
                          )}
                        >
                          Denk Takasları Gör
                        </Link>
                        <Link
                          href={`/products/${product.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "rounded-full border-[#fde8dc] font-bold text-neutral-800 hover:border-[#ff4f01]/40"
                          )}
                        >
                          Ürünü Gör
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "rounded-full border-violet-200 font-bold text-violet-900 hover:border-violet-400"
                          )}
                        >
                          Düzenle
                        </Link>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => void handleDelete(product.id)}
                          className="rounded-full border border-red-200/80 font-bold"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                              Siliniyor...
                            </>
                          ) : (
                            <>
                              <Trash2 className="size-3.5" aria-hidden />
                              Sil
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
