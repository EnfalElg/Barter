"use client";

import { Camera, Loader2, MapPin, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { OwnerValueAdjustPanel } from "@/components/owner-value-adjust-panel";
import { PrivateValueNote } from "@/components/private-value-note";
import { WantedPrefsFields } from "@/components/wanted-prefs-fields";
import { BARTER_AI_CHECK_NOTE, BARTER_TAGLINE } from "@/lib/barter-copy";
import type { WantedPrefs } from "@/lib/wanted";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ValueCheckResult } from "@/lib/types/product";
import { cn } from "@/lib/utils";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

const CATEGORIES = [
  "Elektronik",
  "Ev & yaşam",
  "Moda",
  "Hobi",
  "Endüstriyel / toplu",
  "Kağıt & geri dönüşüm",
  "Metal",
  "Diğer",
] as const;

const CONDITIONS = [
  "Yeni / kapalı kutu",
  "Az kullanılmış",
  "İyi",
  "Yıpranmış",
  "Parça / eksik",
] as const;

type Phase = "form" | "result";

const fieldClass =
  "min-h-14 rounded-2xl border-neutral-200/90 bg-[#fffaf7] px-4 text-base font-medium shadow-inner transition placeholder:text-neutral-400 focus-visible:border-[#ff4f01]/45 focus-visible:ring-[3px] focus-visible:ring-[#ff4f01]/20";

const shellShadow =
  "shadow-[0_12px_48px_-12px_rgba(0,0,0,0.12),0_8px_28px_-8px_rgba(255,79,1,0.18)]";

const panelShadow =
  "shadow-[0_8px_28px_-8px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(255,79,1,0.06)]";

export function PostItemForm() {
  const baseId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [listingImage, setListingImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [condition, setCondition] = useState<string>(CONDITIONS[1]);
  const [location, setLocation] = useState("İstanbul");
  const [userValue, setUserValue] = useState<string>("");
  const [lat] = useState("41.015137");
  const [lng] = useState("28.97953");
  const [wanted, setWanted] = useState<WantedPrefs>({
    wanted_categories: [],
    wanted_keywords: [],
  });

  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedUserValue, setSavedUserValue] = useState<number | null>(null);
  const [check, setCheck] = useState<ValueCheckResult | null>(null);
  const [savedMeta, setSavedMeta] = useState<{
    title: string;
    description: string;
    category: string;
    condition: string;
    location: string;
    image_url?: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const clearImage = useCallback(() => {
    setListingImage(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seç (JPEG, PNG, WebP…).");
      return;
    }
    setError(null);
    setListingImage(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 3) {
      setError("Başlık en az 3 karakter olmalıdır.");
      return;
    }
    if (!listingImage && !imagePreviewUrl) {
      setError("Kapak görseli zorunludur.");
      return;
    }
    const uv = Number(userValue.replace(",", "."));
    if (!Number.isFinite(uv) || uv <= 0) {
      setError("Geçerli bir değer girin (pozitif sayı).");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(
        "Supabase yapılandırması eksik: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("İlan kaydetmek için giriş yapın.");
        return;
      }

      let image_url: string | null = null;
      if (listingImage) {
        image_url = await fileToDataUrl(listingImage);
      }

      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        setError("Geçerli enlem ve boylam.");
        return;
      }

      const loc = location.trim() || "Belirtilmedi";

      const { data: inserted, error: insertError } = await supabase
        .from("products")
        .insert({
          owner_id: user.id,
          title: t,
          description: description.trim() || null,
          category: category.trim(),
          condition: condition.trim(),
          image_url,
          location: loc,
          city: loc,
          status: "available",
          user_value: uv,
          quantity: 1,
          unit: "piece",
          lat: latN,
          lng: lngN,
          tags: [],
          ai_min_value: null,
          ai_max_value: null,
          ai_confidence: null,
          ai_value_deviation: null,
          ai_value_status: "unknown",
          ai_badge_label: "AI emin değil",
          ai_badge_color: "gray",
          is_value_hidden: true,
          wanted_categories: wanted.wanted_categories,
          wanted_keywords: wanted.wanted_keywords,
        })
        .select("id")
        .single();

      if (insertError || !inserted?.id) {
        throw new Error(insertError?.message ?? "Kayıt başarısız");
      }

      const productId = String(inserted.id);

      const vcRes = await fetch("/api/ai/value-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: description.trim(),
          category: category.trim(),
          condition: condition.trim(),
          user_value: uv,
          image_url: image_url ?? undefined,
          location: loc,
        }),
      });
      const vc = (await vcRes.json()) as ValueCheckResult & { error?: string };

      const { error: upErr } = await supabase
        .from("products")
        .update({
          ai_min_value: vc.ai_min_value,
          ai_max_value: vc.ai_max_value,
          ai_confidence: vc.ai_confidence,
          ai_value_deviation: vc.ai_value_deviation,
          ai_value_status: vc.ai_value_status,
          ai_badge_label: vc.ai_badge_label,
          ai_badge_color: vc.ai_badge_color,
          ai_uncertainty_reason: vc.ai_uncertainty_reason,
        })
        .eq("id", productId);

      if (upErr) {
        console.warn("[post] AI alanları güncellenemedi", upErr.message);
      }

      setSavedId(productId);
      setSavedUserValue(uv);
      setCheck(vc);
      setSavedMeta({
        title: t,
        description: description.trim(),
        category: category.trim(),
        condition: condition.trim(),
        location: loc,
        image_url: image_url ?? undefined,
      });
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  };

  const photoInputId = `${baseId}-photo`;

  if (phase === "result" && savedId && savedUserValue != null && check && savedMeta) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/95 p-6 ring-1 ring-black/[0.05] backdrop-blur-md sm:p-8",
            shellShadow
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gradient-to-br from-[#ff4f01]/15 to-violet-300/20 blur-2xl"
          />
          <div className="relative space-y-6">
            <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
              AI Değer Kontrolü
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
              Kayıt tamam
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Değerini kaydetmeden önce aşağıdan güncelleyebilirsin.
            </p>
            <p className="text-xs leading-relaxed text-neutral-500">{BARTER_AI_CHECK_NOTE}</p>
            <OwnerValueAdjustPanel
              productId={savedId}
              initialUserValue={savedUserValue}
              aiMinValue={check.ai_min_value}
              aiMaxValue={check.ai_max_value}
              aiConfidence={check.ai_confidence}
              aiValueStatus={check.ai_value_status}
              aiUncertaintyReason={check.ai_uncertainty_reason}
              reasoningSummary={check.reasoning_summary}
              recheckPayload={savedMeta}
              onSaved={(v) => setSavedUserValue(v)}
            />
            <div className="flex flex-col gap-3 border-t border-[#fde8dc]/80 pt-6 sm:flex-row sm:justify-center">
              <Link
                href={`/products/${savedId}/matches`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full border-0 bg-[#ff4f01] px-8 font-black text-white shadow-lg hover:bg-[#e64700]"
                )}
              >
                Denk Takasları Gör
              </Link>
              <Link
                href="/discover"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "rounded-full border-2 font-bold"
                )}
              >
                Keşfet
              </Link>
            </div>
            <p className="text-center">
              <Link
                href={`/products/${savedId}`}
                className="text-sm font-semibold text-[#ff4f01] underline-offset-4 hover:underline"
              >
                İlan sayfasına git
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex justify-center gap-2">
        {(["Ürün", "Değer", "AI"] as const).map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-md shadow-black/5",
              i === 0 && "bg-[#ff4f01] text-white",
              i === 1 && "bg-violet-100 text-violet-800",
              i === 2 && "bg-amber-100 text-amber-900"
            )}
          >
            <span className="tabular-nums opacity-80">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/95 p-6 ring-1 ring-black/[0.05] backdrop-blur-md sm:p-8",
          shellShadow
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-gradient-to-br from-[#ff4f01]/20 via-fuchsia-400/15 to-transparent blur-2xl"
        />

        <form onSubmit={onSubmit} className="relative space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-black tracking-tight text-neutral-900 sm:text-2xl">
              Takasa çıkar
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {BARTER_TAGLINE} Değerini sen belirle; AI yalnızca makullük rozeti üretir.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Kapak görseli <span className="text-red-600">*</span>
            </Label>
            <input
              ref={imageInputRef}
              id={photoInputId}
              name="listingPhoto"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onImageChange}
            />
            <div
              className={cn(
                "relative mx-auto w-full max-w-[min(100%,320px)] overflow-hidden rounded-2xl bg-[#fffaf7]",
                panelShadow
              )}
            >
              {imagePreviewUrl ? (
                <div className="relative aspect-square w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {listingImage ? (
                    <div className="absolute left-2 right-2 top-2 flex justify-end">
                      <span className="max-w-[70%] truncate rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {listingImage.name}
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/55 via-black/25 to-transparent p-3 pt-10">
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-white/95 py-2.5 text-sm font-bold text-[#ff4f01] shadow-md ring-1 ring-black/5 backdrop-blur-sm transition hover:bg-white"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/95 text-neutral-700 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition hover:bg-white hover:text-red-600"
                      onClick={clearImage}
                      aria-label="Fotoğrafı kaldır"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor={photoInputId}
                  className={cn(
                    "flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-[#ff4f01]/40 bg-gradient-to-b from-[#fffaf7] to-[#ffe8dc]/50 p-8 transition hover:border-[#ff4f01]/70"
                  )}
                >
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-[#ff4f01]/12 text-[#ff4f01] shadow-inner ring-2 ring-[#ff4f01]/15">
                    <Camera className="size-8" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="text-center">
                    <span className="block text-base font-black text-neutral-900">
                      Fotoğraf Ekle
                    </span>
                    <span className="mt-1 block text-xs font-medium text-neutral-500">
                      JPEG veya PNG — dokun veya tıkla
                    </span>
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`${baseId}-title`}
              className="text-xs font-bold uppercase tracking-wide text-neutral-500"
            >
              Başlık
            </Label>
            <Input
              id={`${baseId}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ne takas ediyorsun?"
              className={cn(fieldClass, panelShadow)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`${baseId}-desc`}
              className="text-xs font-bold uppercase tracking-wide text-neutral-500"
            >
              Açıklama
            </Label>
            <Textarea
              id={`${baseId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Durum, teslim, detay…"
              className={cn(fieldClass, "min-h-[7.5rem] resize-none py-3.5", panelShadow)}
            />
            <p className="text-xs text-neutral-500">
              Marka/model belirtmek AI değerlendirmesini iyileştirir. Kondisyonu ve eksik
              parçaları açıkça yaz.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Kategori
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(fieldClass, "w-full py-3", panelShadow)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Durum
              </Label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={cn(fieldClass, "w-full py-3", panelShadow)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500">
                Kondisyonu net seçmek (kutu, garanti, eksik parça) AI rozetini güçlendirir.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-violet-100/90 bg-gradient-to-br from-violet-50/95 to-orange-50/60 p-4 sm:p-5",
              panelShadow
            )}
          >
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              <MapPin className="size-3.5" aria-hidden />
              Konum
            </p>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="İl / ilçe / semt"
              className={cn(fieldClass, "bg-white/90", panelShadow)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`${baseId}-value`}
              className="text-xs font-bold uppercase tracking-wide text-neutral-500"
            >
              Bu ürüne biçtiğin değer
            </Label>
            <Input
              id={`${baseId}-value`}
              value={userValue}
              onChange={(e) => setUserValue(e.target.value)}
              type="text"
              inputMode="decimal"
              placeholder="ör. 25000"
              className={cn(fieldClass, panelShadow)}
            />
            <p className="text-xs leading-relaxed text-neutral-500">
              Bu değer diğer kullanıcılara fiyat olarak gösterilmez. Sadece denk takasları
              bulmak için kullanılır.
            </p>
            <PrivateValueNote variant="compact" className="mt-1" />
            <p className="text-[11px] font-bold text-[#ff4f01]">{BARTER_TAGLINE}</p>
          </div>

          <WantedPrefsFields value={wanted} onChange={setWanted} disabled={busy} />

          {error ? (
            <p
              className={cn(
                "rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 ring-1 ring-red-100",
                panelShadow
              )}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="rounded-2xl border border-dashed border-[#ff4f01]/30 bg-[#fffaf7]/95 p-4 ring-1 ring-black/[0.03]">
            <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ff4f01]">
              <Sparkles className="size-4" aria-hidden />
              AI değer kontrolü
            </div>
            <p className="text-center text-sm text-neutral-500">
              Kaydettiğinde AI yalnızca denge kontrolü ve rozet üretir — {BARTER_AI_CHECK_NOTE}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-center">
            <button
              type="submit"
              disabled={busy}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full gap-2 rounded-full border-0 bg-[#ff4f01] px-8 font-black text-white shadow-[0_10px_32px_-8px_rgba(255,79,1,0.55)] hover:bg-[#e64700] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              )}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-5" aria-hidden />
              )}
              Kaydet ve AI kontrolü yap
            </button>
            <Link
              href="/discover"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full rounded-full border-2 border-neutral-200/90 bg-white px-8 font-bold text-neutral-800 shadow-md sm:w-auto"
              )}
            >
              Keşfe git
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
