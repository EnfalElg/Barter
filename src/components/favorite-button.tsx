"use client";

import { Heart, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FavoriteButtonProps = {
  productId: string;
  initialSaved?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  variant?: "icon" | "button";
  className?: string;
  viewerId?: string | null;
  loginNext?: string;
  onSavedChange?: (saved: boolean) => void;
  /** Button variant label when saved (default: Kaydedildi) */
  savedLabel?: string;
  /** Button variant label when not saved (default: Kaydet) */
  unsavedLabel?: string;
};

export function FavoriteButton({
  productId,
  initialSaved = false,
  disabled = false,
  size = "sm",
  variant = "icon",
  className,
  viewerId,
  loginNext,
  onSavedChange,
  savedLabel = "Kaydedildi",
  unsavedLabel = "Kaydet",
}: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  const toggle = useCallback(async () => {
    if (disabled || busy) return;

    if (!viewerId) {
      const next = loginNext ?? pathname ?? "/discover";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const nextSaved = !saved;
    setSaved(nextSaved);
    setBusy(true);
    setError(null);

    try {
      if (nextSaved) {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
        const body = (await res.json()) as { error?: string; success?: boolean };
        if (!res.ok || !body.success) {
          throw new Error(body.error ?? "Ürün kaydedilemedi.");
        }
      } else {
        const res = await fetch(`/api/favorites/${encodeURIComponent(productId)}`, {
          method: "DELETE",
        });
        const body = (await res.json()) as { error?: string; success?: boolean };
        if (!res.ok || !body.success) {
          throw new Error(body.error ?? "Kayıt kaldırılırken hata oluştu.");
        }
      }
      onSavedChange?.(nextSaved);
      router.refresh();
    } catch (e) {
      setSaved(!nextSaved);
      setError(e instanceof Error ? e.message : "Ürün kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, loginNext, onSavedChange, pathname, productId, router, saved, viewerId]);

  const iconSize = size === "md" ? "size-5" : "size-4";
  const label = saved ? savedLabel : unsavedLabel;

  const content = (
    <>
      {busy ? (
        <Loader2 className={cn(iconSize, "animate-spin")} aria-hidden />
      ) : (
        <Heart
          className={cn(iconSize, saved && "fill-[#ff4f01] text-[#ff4f01]")}
          aria-hidden
        />
      )}
      {variant === "button" ? <span>{label}</span> : null}
    </>
  );

  return (
    <div className={cn("inline-flex flex-col items-end", className)}>
      <Button
        type="button"
        variant={variant === "icon" ? "ghost" : "outline"}
        size={size === "md" ? "default" : "sm"}
        disabled={disabled || busy}
        onClick={() => void toggle()}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={cn(
          variant === "icon"
            ? "size-9 rounded-full bg-white/90 p-0 shadow-md ring-1 ring-black/[0.06] backdrop-blur-sm hover:bg-white"
            : "rounded-full border-[#ff4f01]/30 font-bold text-neutral-800 hover:bg-[#fff7f2]",
          saved && variant === "button" && "border-[#ff4f01]/50 bg-[#fff0e8] text-[#c2410c]"
        )}
      >
        {content}
      </Button>
      {error ? (
        <span className="mt-1 max-w-[10rem] text-right text-[10px] font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </div>
  );
}
