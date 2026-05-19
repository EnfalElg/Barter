import type { AIValueStatus } from "@/lib/types/product";
import { cn } from "@/lib/utils";

const RISKY_AI = new Set<AIValueStatus | string>(["very_high", "very_low", "unknown"]);

export type ProductSafetyHintsProps = {
  aiValueStatus?: AIValueStatus | string | null;
  ownerTrustScore?: number | null;
  className?: string;
};

export function ProductSafetyHints({
  aiValueStatus,
  ownerTrustScore,
  className,
}: ProductSafetyHintsProps) {
  const hints: string[] = [];
  const status = (aiValueStatus ?? "unknown").toLowerCase();

  if (RISKY_AI.has(status)) {
    hints.push(
      "Bu ilanda değer veya bilgi belirsizliği olabilir. Takas öncesi ek bilgi istemeni öneririz."
    );
  }

  const trust =
    ownerTrustScore != null && Number.isFinite(ownerTrustScore)
      ? Math.round(ownerTrustScore)
      : null;
  if (trust != null && trust < 50) {
    hints.push("İlan sahibi için sınırlı güven geçmişi var.");
  }

  if (hints.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 ring-1 ring-amber-500/10",
        className
      )}
    >
      <ul className="list-inside list-disc space-y-1">
        {hints.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
