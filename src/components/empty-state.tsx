import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cardBase } from "@/lib/ui-polish";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        cardBase,
        "border-dashed border-orange-200/90 px-6 py-14 text-center",
        className
      )}
    >
      {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "barter", size: "barter", className: "mt-6" }))}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
