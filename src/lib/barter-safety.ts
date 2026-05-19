export type SafetyRiskLevel = "low" | "medium" | "high" | "unknown";

export type SafetySignalSeverity = "info" | "warning" | "danger";

export type SafetyColor = "green" | "yellow" | "orange" | "red" | "gray";

export type SafetySignal = {
  code: string;
  label: string;
  severity: SafetySignalSeverity;
};

export type BarterSafetyInput = {
  requesterTrustScore?: number | null;
  ownerTrustScore?: number | null;
  requesterCompletedSwaps?: number | null;
  ownerCompletedSwaps?: number | null;

  requestedProductAiStatus?: string | null;
  offeredProductAiStatuses?: string[];

  requestedProductHasImage?: boolean;
  offeredProductsHaveImages?: boolean[];

  requestedProductDescriptionLength?: number;
  offeredProductDescriptionLengths?: number[];

  offerMatchLabel?: string | null;
  offerStatus?: string | null;

  sameLocationText?: boolean;
  hasChatThread?: boolean;
};

export type BarterSafetyResult = {
  risk_level: SafetyRiskLevel;
  label: string;
  color: SafetyColor;
  signals: SafetySignal[];
  tips: string[];
};

const RISKY_AI = new Set(["very_high", "very_low", "unknown"]);

const BASE_TIPS = [
  "Yüz yüze takasta kalabalık ve güvenli bir yer seç.",
  "Ürünü teslim almadan önce kontrol et.",
  "Şüpheli durumda sohbet üzerinden ek fotoğraf veya bilgi iste.",
] as const;

function cappedSum(values: number[], cap: number): number {
  return Math.min(cap, values.reduce((sum, v) => sum + v, 0));
}

function isRiskyAi(status: string | null | undefined): boolean {
  if (!status) return false;
  return RISKY_AI.has(String(status).toLowerCase());
}

function trustScore(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v);
}

function swapsCount(v: number | null | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.round(v));
}

function hasEnoughData(input: BarterSafetyInput): boolean {
  const hasRequested =
    input.requestedProductAiStatus != null ||
    input.requestedProductHasImage !== undefined ||
    (input.requestedProductDescriptionLength ?? 0) > 0;
  const hasOffered = (input.offeredProductAiStatuses?.length ?? 0) > 0;
  const hasTrust =
    trustScore(input.ownerTrustScore) != null || trustScore(input.requesterTrustScore) != null;
  return hasRequested || hasOffered || hasTrust;
}

export function evaluateBarterSafety(input: BarterSafetyInput): BarterSafetyResult {
  if (!hasEnoughData(input)) {
    return {
      risk_level: "unknown",
      label: "Yeterli bilgi yok",
      color: "gray",
      signals: [],
      tips: [...BASE_TIPS, "Ek fotoğraf veya bilgi istemekten çekinme."],
    };
  }

  let points = 0;
  const signals: SafetySignal[] = [];

  const ownerTrust = trustScore(input.ownerTrustScore);
  const requesterTrust = trustScore(input.requesterTrustScore);
  const ownerSwaps = swapsCount(input.ownerCompletedSwaps);
  const requesterSwaps = swapsCount(input.requesterCompletedSwaps);

  if (ownerTrust != null && ownerTrust < 40) {
    points += 30;
    signals.push({
      code: "owner_trust_low",
      label: "İlan sahibinin güven skoru düşük.",
      severity: "danger",
    });
  } else if (ownerTrust != null && ownerTrust < 60) {
    points += 10;
    signals.push({
      code: "owner_trust_mid",
      label: "İlan sahibi için sınırlı güven geçmişi var.",
      severity: "warning",
    });
  }

  if (requesterTrust != null && requesterTrust < 40) {
    points += 20;
    signals.push({
      code: "requester_trust_low",
      label: "Karşı tarafın güven skoru düşük görünüyor.",
      severity: "danger",
    });
  } else if (requesterTrust != null && requesterTrust < 60) {
    points += 8;
    signals.push({
      code: "requester_trust_mid",
      label: "Karşı taraf yeni kullanıcı olabilir.",
      severity: "warning",
    });
  }

  if (ownerSwaps === 0) {
    points += 8;
    if (!signals.some((s) => s.code === "owner_trust_mid" || s.code === "owner_trust_low")) {
      signals.push({
        code: "owner_no_swaps",
        label: "İlan sahibinin henüz tamamlanmış takası görünmüyor.",
        severity: "warning",
      });
    }
  }

  if (requesterSwaps === 0) {
    points += 5;
    signals.push({
      code: "requester_no_swaps",
      label: "Karşı tarafın henüz tamamlanmış takası görünmüyor.",
      severity: "info",
    });
  }

  if (isRiskyAi(input.requestedProductAiStatus)) {
    points += 15;
    signals.push({
      code: "requested_ai_risky",
      label: "Ürünün AI değer rozeti riskli görünüyor.",
      severity: "warning",
    });
  }

  const offeredAiRisky = (input.offeredProductAiStatuses ?? []).filter((s) => isRiskyAi(s));
  if (offeredAiRisky.length > 0) {
    points += cappedSum(offeredAiRisky.map(() => 10), 20);
    signals.push({
      code: "offered_ai_risky",
      label: "Teklif ettiğin ürünlerden birinde AI rozeti riskli görünüyor.",
      severity: "warning",
    });
  }

  if (input.requestedProductHasImage === false) {
    points += 15;
    signals.push({
      code: "requested_no_image",
      label: "Ürün fotoğrafı eksik.",
      severity: "warning",
    });
  }

  const missingOfferedImages = (input.offeredProductsHaveImages ?? []).filter((h) => !h).length;
  if (missingOfferedImages > 0) {
    points += cappedSum(Array(missingOfferedImages).fill(8), 16);
    signals.push({
      code: "offered_no_image",
      label: "Teklif ettiğin ürünlerden birinde fotoğraf eksik.",
      severity: "warning",
    });
  }

  const reqDesc = input.requestedProductDescriptionLength ?? 0;
  if (reqDesc > 0 && reqDesc < 30) {
    points += 8;
    signals.push({
      code: "requested_desc_short",
      label: "Ürün açıklaması kısa.",
      severity: "warning",
    });
  }

  const shortOfferedDescs = (input.offeredProductDescriptionLengths ?? []).filter(
    (len) => len > 0 && len < 30
  ).length;
  if (shortOfferedDescs > 0) {
    points += cappedSum(Array(shortOfferedDescs).fill(5), 10);
    signals.push({
      code: "offered_desc_short",
      label: "Teklif ettiğin ürünlerden birinde açıklama kısa.",
      severity: "info",
    });
  }

  const matchLabel = input.offerMatchLabel?.trim() ?? "";
  if (matchLabel === "Dengesiz takas") {
    points += 15;
    signals.push({
      code: "match_unbalanced",
      label: "Takas dengesi dengesiz görünüyor.",
      severity: "danger",
    });
  } else if (matchLabel === "Biraz dengesiz") {
    points += 8;
    signals.push({
      code: "match_slightly_unbalanced",
      label: "Takas dengesi biraz dengesiz.",
      severity: "warning",
    });
  }

  if (input.sameLocationText) {
    points -= 5;
  }

  if (input.hasChatThread) {
    points -= 5;
  }

  if (ownerTrust != null && ownerTrust >= 80) {
    points -= 10;
  }

  if (requesterTrust != null && requesterTrust >= 80) {
    points -= 5;
  }

  points = Math.max(0, Math.min(100, points));

  let risk_level: SafetyRiskLevel;
  let label: string;
  let color: SafetyColor;

  if (points <= 24) {
    risk_level = "low";
    label = "Güvenli görünüyor";
    color = "green";
  } else if (points <= 54) {
    risk_level = "medium";
    label = "Dikkatli ilerle";
    color = "orange";
  } else {
    risk_level = "high";
    label = "Riskli olabilir";
    color = "red";
  }

  const tips = [...BASE_TIPS, "Ek fotoğraf veya bilgi istemekten çekinme."];

  if (risk_level === "high") {
    tips.push("Bu takasta dikkatli ilerlemeni öneririz.");
    tips.push("Mümkünse fatura, seri numarası veya ek kanıt iste.");
  } else if (risk_level === "medium") {
    tips.push("Takas öncesi birkaç detay daha sormak iyi olabilir.");
  } else if (risk_level === "low") {
    tips.push("Yine de ürünü teslim almadan önce kontrol etmeyi unutma.");
  }

  tips.push("Şüpheli durumda takası iptal edebilirsin.");

  const uniqueSignals = signals.filter(
    (s, i, arr) => arr.findIndex((x) => x.code === s.code) === i
  );

  return {
    risk_level,
    label,
    color,
    signals: uniqueSignals,
    tips,
  };
}

export type PublicBarterSafety = BarterSafetyResult;

export function toPublicSafety(result: BarterSafetyResult): PublicBarterSafety {
  return {
    risk_level: result.risk_level,
    label: result.label,
    color: result.color,
    signals: result.signals,
    tips: result.tips,
  };
}
