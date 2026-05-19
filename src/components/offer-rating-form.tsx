"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { Loader2, Star } from "lucide-react";

export type OfferRatingFormProps = {
  offerId: string;
  onSuccess: () => void;
  onCancel?: () => void;
};

export function OfferRatingForm({ offerId, onSuccess, onCancel }: OfferRatingFormProps) {
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (score < 1 || score > 5) {
      setError("Lütfen 1–5 arası bir puan seç.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(offerId)}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          comment: comment.trim() || undefined,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Gönderilemedi");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setSubmitting(false);
    }
  }, [comment, offerId, onSuccess, score]);

  const display = hover || score;

  return (
    <div className="rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4">
      <p className="text-sm font-black text-neutral-900">Takas deneyimini değerlendir</p>
      <div className="mt-3">
        <Label className="text-xs font-semibold text-neutral-600">Puan</Label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} yıldız`}
              className="rounded p-0.5 transition"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setScore(n)}
            >
              <Star
                className={cn(
                  "size-8",
                  n <= display
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-neutral-300"
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Label
          htmlFor={`rating-comment-${offerId}`}
          className="text-xs font-semibold text-neutral-600"
        >
          Yorum ekle
        </Label>
        <Textarea
          id={`rating-comment-${offerId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="İsteğe bağlı…"
          rows={3}
          className="resize-none rounded-2xl"
        />
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          onClick={() => void submit()}
          className="rounded-full bg-[#ff4f01] font-bold hover:bg-[#e64700]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Gönderiliyor…
            </>
          ) : (
            "Değerlendirmeyi Gönder"
          )}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-full font-bold"
          >
            Vazgeç
          </Button>
        ) : null}
      </div>
    </div>
  );
}
