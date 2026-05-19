import type { MeetingSuggestion } from "@/lib/meeting-suggestions";
import { cn } from "@/lib/utils";

export type SafeMeetingPanelProps = {
  suggestions: MeetingSuggestion[];
  compact?: boolean;
  className?: string;
};

export function SafeMeetingPanel({
  suggestions,
  compact = false,
  className,
}: SafeMeetingPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] ring-1 ring-black/[0.03]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <h3
        className={cn(
          "font-black text-neutral-900",
          compact ? "text-xs" : "text-sm"
        )}
      >
        Güvenli buluşma önerileri
      </h3>
      <ul className={cn("mt-3 list-none space-y-2 p-0", compact && "mt-2 space-y-1.5")}>
        {suggestions.map((s) => (
          <li
            key={s.title}
            className={cn(
              "flex gap-2.5 rounded-xl bg-white/80 ring-1 ring-black/[0.04]",
              compact ? "p-2" : "p-2.5"
            )}
          >
            <span className="shrink-0 text-lg leading-none" aria-hidden>
              {s.icon}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "font-bold text-neutral-900",
                  compact ? "text-[11px]" : "text-xs"
                )}
              >
                {s.title}
              </p>
              <p
                className={cn(
                  "mt-0.5 leading-snug text-neutral-600",
                  compact ? "text-[10px]" : "text-[11px]"
                )}
              >
                {s.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
