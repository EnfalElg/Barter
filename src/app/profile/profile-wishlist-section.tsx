"use client";

import { useState } from "react";

import { WantedPrefsFields } from "@/components/wanted-prefs-fields";
import { WantedTags } from "@/components/wanted-tags";
import { Button } from "@/components/ui/button";
import type { WantedPrefs } from "@/lib/wanted";

import { Loader2, Pencil } from "lucide-react";

export type ProfileWishlistSectionProps = {
  initial: WantedPrefs;
};

export function ProfileWishlistSection({ initial }: ProfileWishlistSectionProps) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/profile/wishlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Kaydedilemedi");
      }
      setSaved(draft);
      setEditing(false);
      setSuccess("İstek listesi güncellendi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8 rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-neutral-900">İstek Listem</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Genel olarak ilgilendiğin ürünleri seç. Bu, önerileri iyileştirir.
          </p>
        </div>
        {!editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(saved);
              setEditing(true);
              setSuccess(null);
              setError(null);
            }}
            className="rounded-full font-bold"
          >
            <Pencil className="mr-1.5 size-4" aria-hidden />
            Düzenle
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 space-y-4">
          <WantedPrefsFields value={draft} onChange={setDraft} disabled={busy} className="border-0 bg-transparent p-0" />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-full bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDraft(saved);
                setEditing(false);
              }}
              className="rounded-full font-bold"
            >
              İptal
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Genel istek listem
          </p>
          <WantedTags
            categories={saved.wanted_categories}
            keywords={saved.wanted_keywords}
            className="mt-2"
          />
        </div>
      )}

      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm font-medium text-emerald-800">{success}</p> : null}
    </section>
  );
}
