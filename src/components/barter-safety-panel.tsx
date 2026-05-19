import { SafetyBadge } from "@/components/safety-badge";
import type { BarterSafetyResult } from "@/lib/barter-safety";
import { cn } from "@/lib/utils";

export type BarterSafetyPanelProps = {
  safety: BarterSafetyResult;
  className?: string;
};

export function BarterSafetyPanel({ safety, className }: BarterSafetyPanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] p-4 ring-1 ring-black/[0.03]",
        className
      )}
    >
      <h3 className="text-sm font-black text-neutral-900">Bu takas güvenli mi?</h3>
      <div className="mt-2">
        <SafetyBadge
          riskLevel={safety.risk_level}
          label={safety.label}
          color={safety.color}
          size="md"
        />
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
          Risk sinyalleri
        </p>
        {safety.signals.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">Belirgin bir risk sinyali bulunamadı.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-neutral-700">
            {safety.signals.map((s) => (
              <li key={s.code}>{s.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
          Güvenlik ipuçları
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-neutral-600">
          {safety.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
