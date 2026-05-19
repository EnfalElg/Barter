import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { bodyText, eyebrow, pageTitle, sectionTitle } from "@/lib/ui-polish";

export type PageHeaderProps = {
  label?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  label,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 sm:mb-8", className)}>
      {label ? <p className={eyebrow}>{label}</p> : null}
      <h1 className={cn(label ? "mt-2" : "", pageTitle)}>{title}</h1>
      {description ? (
        <p className={cn("mt-2 max-w-2xl", bodyText)}>{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

export type SectionHeadingProps = {
  title: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({ title, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <h2 className={sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}
