export type TrustScoreInput = {
  hasFullName: boolean;
  hasAvatar: boolean;
  hasLocation: boolean;
  hasBio: boolean;
  completedSwaps: number;
  ratingAverage: number;
  ratingCount: number;
  accountAgeDays?: number;
  activeProductCount?: number;
  suspiciousProductCount?: number;
};

export type TrustLabelColor = "green" | "yellow" | "orange" | "red" | "gray";

export function clampTrustScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateTrustScore(input: TrustScoreInput): number {
  let score = 40;

  if (input.hasFullName) score += 8;
  if (input.hasAvatar) score += 8;
  if (input.hasLocation) score += 6;
  if (input.hasBio) score += 4;

  const swaps = Math.max(0, input.completedSwaps);
  if (swaps >= 10) score += 20;
  else if (swaps >= 3) score += 14;
  else if (swaps >= 1) score += 8;

  const ratingCount = Math.max(0, input.ratingCount);
  if (ratingCount >= 10) score += 12;
  else if (ratingCount >= 3) score += 8;
  else if (ratingCount >= 1) score += 5;

  if (ratingCount > 0) {
    const avg = input.ratingAverage;
    if (avg >= 4.5) score += 12;
    else if (avg >= 4.0) score += 8;
    else if (avg >= 3.5) score += 4;
    else if (avg < 3) score -= 15;
  }

  const ageDays = input.accountAgeDays ?? 0;
  if (ageDays >= 180) score += 8;
  else if (ageDays >= 30) score += 5;

  const active = input.activeProductCount ?? 0;
  if (active >= 5) score += 5;
  else if (active >= 1) score += 3;

  const suspicious = input.suspiciousProductCount ?? 0;
  if (suspicious >= 3) score -= 12;
  else if (suspicious >= 1) score -= 5;

  return clampTrustScore(score);
}

export function getTrustLabel(score: number | null | undefined): {
  label: string;
  color: TrustLabelColor;
} {
  if (score == null || !Number.isFinite(score)) {
    return { label: "Güven skoru yok", color: "gray" };
  }

  const s = clampTrustScore(score);

  if (s >= 85) return { label: "Çok güvenilir", color: "green" };
  if (s >= 70) return { label: "Güvenilir", color: "green" };
  if (s >= 50) return { label: "Yeni veya sınırlı geçmiş", color: "yellow" };
  if (s >= 30) return { label: "Dikkatli ilerle", color: "orange" };
  return { label: "Riskli görünüyor", color: "red" };
}

/** Short label for compact surfaces */
export function getTrustShortLabel(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) {
    return "Yeni kullanıcı";
  }
  const s = clampTrustScore(score);
  if (s >= 85) return "Çok güvenilir";
  if (s >= 70) return "Güvenilir kullanıcı";
  if (s >= 50) return "Yeni kullanıcı";
  if (s >= 30) return "Dikkatli ilerle";
  return "Riskli görünüyor";
}

export function formatRatingAverage(avg: number, count: number): string | null {
  if (count <= 0 || !Number.isFinite(avg)) return null;
  return `${avg.toFixed(1)}/5`;
}
