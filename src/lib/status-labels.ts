import type { ProductStatus } from "@/lib/types/product";
import type { OfferStatus } from "@/lib/types/swap-offer";
import type { RecommendationLevel } from "@/lib/recommendations";

export function productStatusLabel(status: ProductStatus | string): string {
  switch (status) {
    case "available":
      return "Yayında";
    case "hidden":
      return "Gizli";
    case "deleted":
      return "Silindi";
    case "swapped":
      return "Takaslandı";
    case "reserved":
      return "Rezerve";
    case "paused":
      return "Duraklatıldı";
    case "traded":
      return "Takaslandı";
    default:
      return String(status);
  }
}

export function offerStatusLabel(status: OfferStatus | string): string {
  switch (status) {
    case "pending":
      return "Beklemede";
    case "accepted":
      return "Kabul edildi";
    case "completed":
      return "Tamamlandı";
    case "rejected":
      return "Reddedildi";
    case "cancelled":
      return "İptal edildi";
    default:
      return String(status);
  }
}

export const RECOMMENDATION_LEVEL_LABEL: Record<RecommendationLevel, string> = {
  excellent: "Çok uygun takas adayı",
  good: "Uygun takas adayı",
  okay: "Düşünülebilir",
  weak: "Zayıf eşleşme",
};

export function productStatusBadgeClass(status: ProductStatus | string): string {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
    case "swapped":
    case "traded":
      return "bg-violet-50 text-violet-900 ring-violet-200/80";
    case "reserved":
      return "bg-amber-50 text-amber-950 ring-amber-200/80";
    case "hidden":
    case "paused":
      return "bg-neutral-100 text-neutral-700 ring-neutral-200/80";
    case "deleted":
      return "bg-red-50 text-red-900 ring-red-200/80";
    default:
      return "bg-neutral-100 text-neutral-700 ring-neutral-200/80";
  }
}

export function offerStatusBadgeClass(status: OfferStatus | string): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-950 ring-amber-200/80";
    case "accepted":
      return "bg-sky-50 text-sky-900 ring-sky-200/80";
    case "completed":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
    case "rejected":
      return "bg-red-50 text-red-900 ring-red-200/80";
    case "cancelled":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200/80";
    default:
      return "bg-neutral-100 text-neutral-700 ring-neutral-200/80";
  }
}

export function recommendationLevelBadgeClass(level: RecommendationLevel): string {
  switch (level) {
    case "excellent":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
    case "good":
      return "bg-[#fff0e8] text-[#c2410c] ring-[#ff4f01]/20";
    case "okay":
      return "bg-amber-50 text-amber-950 ring-amber-200/80";
    case "weak":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200/80";
    default:
      return "bg-neutral-100 text-neutral-700 ring-neutral-200/80";
  }
}
