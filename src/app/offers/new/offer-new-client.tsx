"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BarterSafetyPanel } from "@/components/barter-safety-panel";
import { OwnProductPicker } from "@/components/own-product-picker";
import { PrivateValueNote } from "@/components/private-value-note";
import {
  BARTER_BALANCE_EXPLANATION,
  BARTER_OFFER_TOP,
  formatBarterBalanceLabel,
} from "@/lib/barter-copy";
import { ProductLocationDisplay } from "@/components/product-location-display";
import { SafeMeetingPanel } from "@/components/safe-meeting-panel";
import { getLocationHint, tradeLocationMessage } from "@/lib/location-utils";
import { getMeetingSuggestions } from "@/lib/meeting-suggestions";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import type { PublicBarterSafety } from "@/lib/barter-safety";
import type { ViewerLocation } from "@/lib/geo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicProduct } from "@/lib/types/product";
import { offerWishCompatibility, type WantedPrefs } from "@/lib/wanted";
import { cn } from "@/lib/utils";

import { Camera, Loader2 } from "lucide-react";

export type OfferNewClientProps = {
  requested: PublicProduct;
  mine: PublicProduct[];
  initialOfferedIds: string[];
  viewer: ViewerLocation;
  ownerWanted: WantedPrefs;
};

export function OfferNewClient({
  requested,
  mine,
  initialOfferedIds,
  viewer,
  ownerWanted,
}: OfferNewClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const id of initialOfferedIds) {
      if (mine.some((p) => p.id === id)) s.add(id);
    }
    return s;
  });
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; label: string; safety: PublicBarterSafety | null }
    | { kind: "err"; text: string }
  >({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = useMemo(() => [...selected].sort(), [selected]);
  const selectionKey = selectedIds.join(",");

  const wishHint = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const offeredCategories = mine
      .filter((p) => selected.has(p.id))
      .map((p) => p.category);
    return offerWishCompatibility(offeredCategories, ownerWanted);
  }, [selected, mine, ownerWanted, selectedIds.length]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setPreview({ kind: "idle" });
      return;
    }

    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setPreview({ kind: "loading" });
      void (async () => {
        try {
          const res = await fetch("/api/offers/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requested_product_id: requested.id,
              offered_product_ids: selectedIds,
            }),
            signal: ctrl.signal,
          });
          const body = (await res.json()) as {
            match_label?: string;
            safety?: PublicBarterSafety;
            error?: string;
          };
          if (!res.ok) {
            setPreview({ kind: "err", text: body.error ?? "Önizleme alınamadı." });
            return;
          }
          setPreview({
            kind: "ok",
            label: body.match_label?.trim() || "Dengeli takas",
            safety: body.safety ?? null,
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          setPreview({ kind: "err", text: "Önizleme alınamadı." });
        }
      })();
    }, 350);

    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [requested.id, selectionKey]);

  const submit = useCallback(async () => {
    if (selectedIds.length === 0) return;

    if (preview.kind === "ok" && preview.safety?.risk_level === "high") {
      const ok = window.confirm(
        "Bu takasta risk uyarıları var. Yine de teklif göndermek istiyor musun?"
      );
      if (!ok) return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requested_product_id: requested.id,
          offered_product_ids: selectedIds,
          message: message.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Gönderilemedi");
      }
      router.refresh();
      router.push("/offers?sent=1");
    } catch (e) {
      setPreview({
        kind: "err",
        text: e instanceof Error ? e.message : "Teklif gönderilemedi.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [message, preview, requested.id, router, selectedIds]);

  const reqBadge = fallbackBadgeLabel(requested.ai_badge_label, requested.ai_badge_color);

  const tradeHint = useMemo(() => {
    if (!viewer.location?.trim()) return null;
    return getLocationHint({
      userLocationText: viewer.location,
      productLocationText: requested.location || requested.city,
      userLat: viewer.lat,
      userLng: viewer.lng,
      productLat: requested.lat,
      productLng: requested.lng,
    });
  }, [viewer, requested]);

  const tradeMsg = tradeHint ? tradeLocationMessage(tradeHint) : null;
  const meetingSuggestions = useMemo(
    () =>
      getMeetingSuggestions({
        locationHintLevel: tradeHint?.level,
        sameCity:
          tradeHint?.level === "same_city" || tradeHint?.level === "same_area",
        trustRiskLevel:
          preview.kind === "ok" && preview.safety
            ? preview.safety.risk_level === "high"
              ? "high"
              : preview.safety.risk_level === "medium"
                ? "medium"
                : preview.safety.risk_level === "low"
                  ? "low"
                  : "unknown"
            : "unknown",
      }),
    [tradeHint, preview]
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Takas
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">
          Takas Teklifi
        </h1>
        <p className="mt-2 text-sm text-neutral-600">{BARTER_OFFER_TOP}</p>
        <PrivateValueNote variant="compact" className="mt-2" />
      </header>

      <section className="mb-8 rounded-3xl border border-white/90 bg-white/95 p-5 shadow-md ring-1 ring-black/[0.04]">
        <h2 className="text-sm font-black text-neutral-900">Almak istediğin ürün</h2>
        <div className="mt-4 flex gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            {requested.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={requested.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400">
                <Camera className="size-10" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-bold text-neutral-900">{requested.title}</p>
            <ProductLocationDisplay
              locationLabel={`${requested.category} · ${requested.location}`}
              product={{
                lat: requested.lat,
                lng: requested.lng,
                location: requested.location,
                city: requested.city,
              }}
              viewer={viewer}
            />
            <ValueBadge label={reqBadge.label} color={reqBadge.color} size="md" />
          </div>
        </div>
      </section>

      <section className="mb-8">
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-6 text-sm text-neutral-600">
            Önce yayında bir ilanın olmalı.{" "}
            <Link href="/post" className="font-bold text-[#ff4f01] underline-offset-2 hover:underline">
              Ürün Ekle
            </Link>
          </p>
        ) : (
          <OwnProductPicker
            products={mine}
            selectedIds={selectedIds}
            onChange={(ids) => setSelected(new Set(ids))}
            title="Teklif ettiğin ürünler"
            helperText="Karşı tarafa sunacağın ürünleri seç."
          />
        )}
      </section>

      <section className="mb-8 rounded-3xl border border-[#fde8dc]/90 bg-[#fffaf7] p-5">
        <h2 className="text-sm font-black text-neutral-900">Takas dengesi</h2>
        <div className="mt-3 min-h-[3rem] text-sm">
          {selectedIds.length === 0 ? (
            <p className="text-neutral-600">En az bir ürün seç.</p>
          ) : preview.kind === "loading" || preview.kind === "idle" ? (
            <p className="flex items-center gap-2 font-medium text-neutral-600">
              <Loader2 className="size-4 animate-spin text-[#ff4f01]" aria-hidden />
              Takas dengesi hesaplanıyor...
            </p>
          ) : preview.kind === "err" ? (
            <p className="font-medium text-red-700">{preview.text}</p>
          ) : (
            <>
              <p className="text-base font-bold text-[#ff4f01]">
                {formatBarterBalanceLabel(preview.label)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                {BARTER_BALANCE_EXPLANATION}
              </p>
            </>
          )}
        </div>
      </section>

      {selectedIds.length > 0 && preview.kind === "ok" && preview.safety ? (
        <BarterSafetyPanel safety={preview.safety} className="mb-8" />
      ) : null}

      {tradeMsg ? (
        <p className="mb-8 rounded-2xl bg-[#fff7f2] px-4 py-3 text-sm font-semibold text-neutral-800 ring-1 ring-[#ff4f01]/12">
          {tradeMsg}
        </p>
      ) : null}

      {selectedIds.length > 0 ? (
        <SafeMeetingPanel suggestions={meetingSuggestions} compact className="mb-8" />
      ) : null}

      {wishHint ? (
        <p
          className={cn(
            "mb-8 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
            wishHint.matches
              ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
              : "bg-amber-50 text-amber-950 ring-amber-100"
          )}
        >
          {wishHint.message}
        </p>
      ) : null}

      <section className="mb-8 space-y-2">
        <Label htmlFor="offer-msg" className="text-sm font-black text-neutral-900">
          Mesaj
        </Label>
        <Textarea
          id="offer-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Kısa bir not ekleyebilirsin (isteğe bağlı)."
          rows={4}
          className="rounded-2xl border-neutral-200/80 bg-white"
        />
      </section>

      <Button
        type="button"
        disabled={submitting || selectedIds.length === 0 || mine.length === 0}
        onClick={() => void submit()}
        className="h-12 w-full rounded-2xl bg-[#ff4f01] text-base font-black text-white shadow-lg hover:bg-[#e64700]"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Gönderiliyor...
          </>
        ) : (
          "Takas Teklifi Gönder"
        )}
      </Button>
    </div>
  );
}
