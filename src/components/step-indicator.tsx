import { cn } from "@/lib/utils";

export type StepIndicatorProps = {
  steps: { label: string }[];
  current: number;
  className?: string;
};

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <ol
      className={cn(
        "mb-6 flex list-none flex-wrap items-center gap-2 p-0 sm:gap-3",
        className
      )}
    >
      {steps.map((step, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={step.label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                active
                  ? "bg-[#ff4f01] text-white shadow-sm"
                  : done
                    ? "bg-orange-100 text-[#c2410c]"
                    : "bg-neutral-100 text-neutral-500"
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "text-xs font-semibold sm:text-sm",
                active ? "text-neutral-900" : "text-neutral-500"
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span className="mx-1 hidden text-neutral-300 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
