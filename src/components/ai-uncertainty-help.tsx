import { AI_UNCERTAINTY_TIPS } from "@/lib/ai-uncertainty";
import { cn } from "@/lib/utils";

import { Lightbulb } from "lucide-react";

export type AiUncertaintyHelpProps = {
  reason?: string | null;
  className?: string;
};

/** Owner-only guidance when AI value status is unknown. */
export function AiUncertaintyHelp({ reason, className }: AiUncertaintyHelpProps) {
  if (!reason?.trim()) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm",
        className
      )}
      role="note"
    >
      <p className="font-semibold text-neutral-900">AI bu ürün için emin değil.</p>
      <p className="mt-1 leading-relaxed text-neutral-700">{reason.trim()}</p>
      <div className="mt-3 flex items-start gap-2">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#ff4f01]" aria-hidden />
        <ul className="list-inside list-disc space-y-0.5 text-xs text-neutral-600">
          {AI_UNCERTAINTY_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
