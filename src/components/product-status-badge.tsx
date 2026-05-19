import {
  productStatusBadgeClass,
  productStatusLabel,
} from "@/lib/status-labels";
import type { ProductStatus } from "@/lib/types/product";
import { cn } from "@/lib/utils";

export type ProductStatusBadgeProps = {
  status: ProductStatus | string;
  className?: string;
};

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
        productStatusBadgeClass(status),
        className
      )}
    >
      {productStatusLabel(status)}
    </span>
  );
}
