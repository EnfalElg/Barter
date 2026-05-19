"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BarterSafetyPanel } from "@/components/barter-safety-panel";
import { EmptyState } from "@/components/empty-state";
import { OfferStatusBadge } from "@/components/offer-status-badge";
import { SafeMeetingPanel } from "@/components/safe-meeting-panel";
import { OfferRatingForm } from "@/components/offer-rating-form";
import { SafetyBadge } from "@/components/safety-badge";
import { StartChatButton } from "@/components/start-chat-button";
import { TrustBadge } from "@/components/trust-badge";
import { formatRatingAverage } from "@/lib/trust-score";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { Button } from "@/components/ui/button";
import { formatBarterBalanceLabel } from "@/lib/barter-copy";
import type { OfferListItem } from "@/lib/types/swap-offer";
import { cardBase, tabButton, tabSwitcher } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

import { Camera, Loader2 } from "lucide-react";

type OfferAction = "accept" | "reject" | "cancel" | "complete";

export type OffersListClientProps = {
  incoming: OfferListItem[];
  outgoing: OfferListItem[];
  viewerId: string;
};

export function OffersListClient({
  incoming,
  outgoing,
  viewerId,
}: OffersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"in" | "out">("in");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ratingOfferId, setRatingOfferId] = useState<string | null>(null);
  const [expandedSafetyId, setExpandedSafetyId] = useState<string | null>(null);
  const [ratedIds, setRatedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const o of [...incoming, ...outgoing]) {
      if (o.has_rated) s.add(o.id);
    }
    return s;
  });

  useEffect(() => {
    if (searchParams.get("sent") === "1") {
      setTab("out");
    }
  }, [searchParams]);

  const patch = useCallback(
    async (offerId: string, action: OfferAction) => {
      setBusyId(offerId);
      try {
        const res = await fetch(`/api/offers/${encodeURIComponent(offerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const b = (await res.json()) as { error?: string };
          throw new Error(b.error ?? "İşlem başarısız");
        }
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Hata");
      } finally {
        setBusyId(null);
      }
    },
    [router]
  );

  const list = tab === "in" ? incoming : outgoing;

  return (
    <div>
      {searchParams.get("sent") === "1" ? (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-100">
          Teklifin gönderildi.
        </p>
      ) : null}

      <div className={cn(tabSwitcher, "mb-6")}>
        <button type="button" onClick={() => setTab("in")} className={tabButton(tab === "in")}>
          Gelen Teklifler ({incoming.length})
        </button>
        <button type="button" onClick={() => setTab("out")} className={tabButton(tab === "out")}>
          Giden Teklifler ({outgoing.length})
        </button>
      </div>

      {incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState
          title="Henüz takas teklifin yok."
          description="Keşfet sayfasından ilgini çeken ürünlere teklif gönderebilirsin."
          actionLabel="Keşfet"
          actionHref="/discover"
        />
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-12 text-center text-sm text-neutral-600">
          {tab === "in" ? "Henüz gelen teklif yok." : "Henüz gönderdiğin teklif yok."}
        </p>
      ) : (
        <ul className="flex list-none flex-col gap-4 p-0">
          {list.map((o) => {
            const hasRated = ratedIds.has(o.id);
            const showRatingForm = ratingOfferId === o.id;

            return (
              <li
                key={o.id}
                className={cn(cardBase, "overflow-hidden p-4 sm:p-5")}
              >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <OfferStatusBadge status={o.status} />
                  <SafetyBadge
                    riskLevel={o.safety.risk_level}
                    label={o.safety.label}
                    color={o.safety.color}
                    size="sm"
                  />
                </div>
                <span className="text-[11px] text-neutral-500">
                  {new Date(o.created_at).toLocaleString("tr-TR")}
                </span>
              </div>

              <div className="mt-3 rounded-xl bg-neutral-50/90 px-3 py-2 ring-1 ring-black/[0.04]">
                <p className="text-xs font-semibold text-neutral-600">
                  {tab === "in" ? "Teklif gönderen" : "İlan sahibi"}: {o.counterparty.display_name}
                </p>
                <TrustBadge score={o.counterparty.trust_score} size="sm" className="mt-1.5" />
                {formatRatingAverage(
                  o.counterparty.rating_average,
                  o.counterparty.rating_count
                ) ? (
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Puan:{" "}
                    {formatRatingAverage(
                      o.counterparty.rating_average,
                      o.counterparty.rating_count
                    )}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-neutral-500">
                      İstenen ürün
                    </p>
                    <div className="mt-2 flex gap-2">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {o.requested?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={o.requested.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-neutral-400">
                            <Camera className="size-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-bold text-neutral-900">
                          {o.requested?.title ?? "—"}
                        </p>
                        {o.requested ? (
                          <div className="mt-1">
                            {(() => {
                              const rb = fallbackBadgeLabel(
                                o.requested.ai_badge_label,
                                o.requested.ai_badge_color
                              );
                              return (
                                <ValueBadge label={rb.label} color={rb.color} size="sm" />
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-neutral-500">
                      Teklif edilenler
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-neutral-800">
                      {o.offered.length === 0 ? (
                        <li className="list-none text-neutral-500">—</li>
                      ) : (
                        o.offered.map((p) => (
                          <li key={p.id} className="line-clamp-2">
                            {p.title}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                {o.match_label ? (
                  <p className="mt-3 text-sm font-bold text-[#ff4f01]">
                    {formatBarterBalanceLabel(o.match_label)}
                  </p>
                ) : null}

                {o.trade_location_message ? (
                  <p className="mt-3 rounded-xl bg-[#fff7f2] px-3 py-2 text-sm font-semibold text-neutral-800 ring-1 ring-[#ff4f01]/12">
                    {o.trade_location_message}
                  </p>
                ) : null}

                {o.meeting_suggestions.length > 0 ? (
                  <SafeMeetingPanel
                    suggestions={o.meeting_suggestions}
                    compact
                    className="mt-3"
                  />
                ) : null}

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedSafetyId((prev) => (prev === o.id ? null : o.id))
                    }
                    className="rounded-full text-xs font-bold"
                  >
                    {expandedSafetyId === o.id ? "Güvenlik detayını gizle" : "Güvenlik detayı"}
                  </Button>
                  {expandedSafetyId === o.id ? (
                    <BarterSafetyPanel safety={o.safety} className="mt-3" />
                  ) : null}
                </div>

                {o.message ? (
                  <p className="mt-2 line-clamp-2 text-xs text-neutral-600">
                    <span className="font-semibold">Mesaj:</span> {o.message}
                  </p>
                ) : null}

                {showRatingForm ? (
                  <div className="mt-4">
                    <OfferRatingForm
                      offerId={o.id}
                      onSuccess={() => {
                        setRatedIds((prev) => new Set(prev).add(o.id));
                        setRatingOfferId(null);
                        router.refresh();
                      }}
                      onCancel={() => setRatingOfferId(null)}
                    />
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <StartChatButton
                    otherUserId={o.other_user_id}
                    productId={o.requested_product_id}
                    viewerId={viewerId}
                    label="Sohbet Et"
                    variant="outline"
                    size="sm"
                  />

                  {tab === "in" && o.status === "pending" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === o.id}
                        onClick={() => void patch(o.id, "accept")}
                        className="rounded-full bg-emerald-600 font-bold hover:bg-emerald-700"
                      >
                        {busyId === o.id ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                            İşleniyor
                          </>
                        ) : (
                          "Kabul Et"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === o.id}
                        onClick={() => void patch(o.id, "reject")}
                        className="rounded-full font-bold"
                      >
                        Reddet
                      </Button>
                    </>
                  ) : null}

                  {tab === "out" && o.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busyId === o.id}
                      onClick={() => void patch(o.id, "cancel")}
                      className="rounded-full font-bold"
                    >
                      {busyId === o.id ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                          İşleniyor
                        </>
                      ) : (
                        "İptal Et"
                      )}
                    </Button>
                  ) : null}

                  {o.status === "accepted" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === o.id}
                      onClick={() => void patch(o.id, "complete")}
                      className="rounded-full bg-[#ff4f01] font-bold hover:bg-[#e64700]"
                    >
                      {busyId === o.id ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                          İşleniyor
                        </>
                      ) : (
                        "Takas Tamamlandı"
                      )}
                    </Button>
                  ) : null}

                  {o.status === "completed" && !hasRated && !showRatingForm ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRatingOfferId(o.id)}
                      className="rounded-full border-[#ff4f01]/40 font-bold text-[#c2410c]"
                    >
                      Değerlendir
                    </Button>
                  ) : null}

                  {o.status === "completed" && hasRated ? (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
                      Değerlendirme yapıldı
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
