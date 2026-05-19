"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPLORE_LOCATION_OPTIONS } from "@/lib/explore-constants";

import { Loader2, MapPin } from "lucide-react";

export type ProfileLocationSectionProps = {
  initialLocation: string | null;
};

export function ProfileLocationSection({ initialLocation }: ProfileLocationSectionProps) {
  const [location, setLocation] = useState(initialLocation ?? "");
  const [saved, setSaved] = useState(initialLocation ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/profile/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: location.trim() || null }),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Kaydedilemedi");
      }
      setSaved(location.trim());
      setSuccess("Konum güncellendi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8 rounded-3xl border border-white/90 bg-white/95 p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ff4f01]">
          <MapPin className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-neutral-900">Konum</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Örneğin: Ankara / Çankaya. Tam adres girme.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Label htmlFor="profile-location" className="text-xs font-bold text-neutral-700">
          Bölge / şehir
        </Label>
        <select
          id="profile-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-11 w-full rounded-2xl border border-neutral-200/80 bg-[#fffaf7] px-3 text-sm font-medium"
        >
          <option value="">Seçilmedi</option>
          {EXPLORE_LOCATION_OPTIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
          {location && !EXPLORE_LOCATION_OPTIONS.includes(location as (typeof EXPLORE_LOCATION_OPTIONS)[number]) ? (
            <option value={location}>{location}</option>
          ) : null}
        </select>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="veya yaz: Ankara / Çankaya"
          className="rounded-2xl border-neutral-200/80 bg-white"
        />
      </div>

      <Button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mt-4 rounded-full bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Kaydediliyor...
          </>
        ) : (
          "Konumu kaydet"
        )}
      </Button>

      {saved ? (
        <p className="mt-2 text-xs text-neutral-500">Kayıtlı: {saved}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-emerald-800">{success}</p> : null}
    </section>
  );
}
