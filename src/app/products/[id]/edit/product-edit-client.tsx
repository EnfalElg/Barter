"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AiUncertaintyHelp } from "@/components/ai-uncertainty-help";
import { PrivateValueNote } from "@/components/private-value-note";
import { ProductValueSlider } from "@/components/product-value-slider";
import { WantedPrefsFields } from "@/components/wanted-prefs-fields";
import {
  BARTER_VALUE_HIDDEN_OWNER,
  BARTER_VALUE_HIDDEN_PUBLIC,
} from "@/lib/barter-copy";
import type { WantedPrefs } from "@/lib/wanted";
import { ValueBadge, fallbackBadgeLabel } from "@/components/value-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evaluateAIBadge, ownerValuePatchFields } from "@/lib/value-badge";
import { isValidOwnerValue } from "@/lib/value-slider";
import type { OwnerProduct, ProductStatus, ValueCheckResult } from "@/lib/types/product";
import { cn } from "@/lib/utils";

import { Camera, Loader2 } from "lucide-react";

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

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "available", label: "Yayında" },
  { value: "paused", label: "Gizli / duraklatıldı" },
];

const fieldClass =
  "min-h-12 rounded-2xl border-neutral-200/90 bg-[#fffaf7] px-4 text-base font-medium shadow-inner focus-visible:border-[#ff4f01]/45 focus-visible:ring-[#ff4f01]/20";

export function ProductEditClient({ product }: { product: OwnerProduct }) {
  const router = useRouter();

  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [category, setCategory] = useState(product.category);
  const [condition, setCondition] = useState(product.condition);
  const [location, setLocation] = useState(product.location);
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    product.status === "paused" ? "paused" : "available"
  );
  const [userValue, setUserValue] = useState(product.user_value);
  const [aiMin, setAiMin] = useState(product.ai_min_value);
  const [aiMax, setAiMax] = useState(product.ai_max_value);
  const [aiConf, setAiConf] = useState(product.ai_confidence);
  const [uncertaintyReason, setUncertaintyReason] = useState(product.ai_uncertainty_reason);

  const [busy, setBusy] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [valueValid, setValueValid] = useState(true);
  const [wanted, setWanted] = useState<WantedPrefs>({
    wanted_categories: product.wanted_categories ?? [],
    wanted_keywords: product.wanted_keywords ?? [],
  });

  const badge = useMemo(
    () =>
      evaluateAIBadge({
        userValue,
        aiMinValue: aiMin,
        aiMaxValue: aiMax,
        aiConfidence: aiConf,
      }),
    [userValue, aiMin, aiMax, aiConf]
  );

  const displayBadge = fallbackBadgeLabel(badge.ai_badge_label, badge.ai_badge_color);

  const buildPatch = useCallback(() => {
    const valueFields = ownerValuePatchFields(userValue, aiMin, aiMax, aiConf);
    return {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim(),
      condition: condition.trim(),
      location: location.trim(),
      image_url: imageUrl.trim() || null,
      status,
      wanted_categories: wanted.wanted_categories,
      wanted_keywords: wanted.wanted_keywords,
      ...valueFields,
    };
  }, [
    title,
    description,
    category,
    condition,
    location,
    imageUrl,
    status,
    userValue,
    aiMin,
    aiMax,
    aiConf,
    wanted,
  ]);

  const save = useCallback(async () => {
    if (title.trim().length < 3) {
      setError("Başlık en az 3 karakter olmalıdır.");
      return;
    }
    if (!isValidOwnerValue(userValue)) {
      setError("Lütfen geçerli bir değer gir.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatch()),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "Kayıt başarısız");
      }
      setSuccess("Ürün güncellendi.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  }, [buildPatch, product.id, router, title]);

  const recheckAi = useCallback(async () => {
    setRecheckBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const vcRes = await fetch("/api/ai/value-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          condition: condition.trim(),
          user_value: userValue,
          location: location.trim(),
          image_url: imageUrl.trim() || undefined,
        }),
      });
      const vc = (await vcRes.json()) as ValueCheckResult & { error?: string };
      if (!vcRes.ok) {
        throw new Error(vc.error ?? "AI değerlendirmesi başarısız");
      }

      setAiMin(vc.ai_min_value);
      setAiMax(vc.ai_max_value);
      setAiConf(vc.ai_confidence);
      setUncertaintyReason(vc.ai_uncertainty_reason);

      const patch = {
        ai_min_value: vc.ai_min_value,
        ai_max_value: vc.ai_max_value,
        ai_confidence: vc.ai_confidence,
        ...ownerValuePatchFields(userValue, vc.ai_min_value, vc.ai_max_value, vc.ai_confidence),
      };

      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? "AI sonuçları kaydedilemedi");
      }
      setSuccess("AI değerlendirmesi güncellendi.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI değerlendirmesi başarısız");
    } finally {
      setRecheckBusy(false);
    }
  }, [category, condition, description, imageUrl, location, product.id, router, title, userValue]);

  const aiRangeText =
    aiMin != null && aiMax != null && Number.isFinite(aiMin) && Number.isFinite(aiMax)
      ? `${Math.round(aiMin).toLocaleString("tr-TR")} – ${Math.round(aiMax).toLocaleString("tr-TR")} TL`
      : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">Profilim</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">
          Ürünü düzenle
        </h1>
      </header>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {product.image_url ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Camera className="size-12" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Ürün başlığı</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={cn(fieldClass, "min-h-[100px]")}
          />
          <p className="text-xs text-neutral-500">
            Marka/model belirtmek AI değerlendirmesini iyileştirir. Kondisyonu ve eksik
            parçaları açıkça yaz.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(fieldClass, "w-full")}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {!CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ? (
              <option value={category}>{category}</option>
            ) : null}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Durum</Label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className={cn(fieldClass, "w-full")}
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

        <div className="space-y-2">
          <Label htmlFor="location">Konum</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image_url">Fotoğraf (URL)</Label>
          <Input
            id="image_url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… veya data URL"
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Yayın durumu</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className={cn(fieldClass, "w-full")}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <section className="rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4">
          <p className="text-sm font-bold text-neutral-900">Bu ürüne biçtiğin değer</p>
          <p className="mt-1 text-lg font-black text-[#ff4f01]">
            {Math.round(userValue).toLocaleString("tr-TR")} TL
          </p>
          {aiRangeText ? (
            <p className="mt-1 text-xs text-neutral-600">AI tahmini aralık: {aiRangeText}</p>
          ) : null}
          <div className="mt-2">
            <ValueBadge label={displayBadge.label} color={displayBadge.color} size="md" />
          </div>
          {badge.ai_value_status === "unknown" ? (
            <AiUncertaintyHelp reason={uncertaintyReason} className="mt-3" />
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            {BARTER_VALUE_HIDDEN_PUBLIC}
          </p>
          <PrivateValueNote variant="compact" className="mt-2" />
          <p className="mt-1 text-[11px] font-semibold text-neutral-500">
            {BARTER_VALUE_HIDDEN_OWNER}
          </p>
        </section>

        <ProductValueSlider
          value={userValue}
          onChange={setUserValue}
          aiMinValue={aiMin}
          aiMaxValue={aiMax}
          aiConfidence={aiConf}
          disabled={busy || recheckBusy}
          onValidityChange={setValueValid}
        />

        <WantedPrefsFields value={wanted} onChange={setWanted} disabled={busy || recheckBusy} />

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={busy || recheckBusy || !valueValid}
            className="h-12 rounded-2xl bg-[#ff4f01] font-black text-white hover:bg-[#e64700]"
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
            disabled={busy || recheckBusy}
            onClick={() => void recheckAi()}
            className="h-12 rounded-2xl border-2 font-bold"
          >
            {recheckBusy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                AI değerlendiriliyor...
              </>
            ) : (
              "AI ile tekrar değerlendir"
            )}
          </Button>
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "inline-flex h-12 items-center justify-center rounded-2xl border-2 font-bold"
            )}
          >
            Profilime dön
          </Link>
        </div>
      </form>
    </div>
  );
}
