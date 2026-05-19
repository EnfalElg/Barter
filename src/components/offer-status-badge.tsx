import { offerStatusBadgeClass, offerStatusLabel } from "@/lib/status-labels";
import type { OfferStatus } from "@/lib/types/swap-offer";
import { cn } from "@/lib/utils";

export type OfferStatusBadgeProps = {
  status: OfferStatus | string;
  className?: string;
};

export function OfferStatusBadge({ status, className }: OfferStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        offerStatusBadgeClass(status),
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" aria-hidden />
      {offerStatusLabel(status)}
    </span>
  );
}
