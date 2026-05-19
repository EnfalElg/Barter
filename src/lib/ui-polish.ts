import { cn } from "@/lib/utils";

/** Warm app canvas */
export const appBg = "bg-[#fff7f2]";

/** Standard page container */
export const pageWrap = "mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-5 sm:py-8";

/** White card surfaces */
export const cardBase =
  "rounded-3xl border border-orange-100/80 bg-white shadow-sm";

export const cardInteractive = cn(
  cardBase,
  "transition-shadow duration-200 hover:shadow-md"
);

export const sectionCard = cn(cardBase, "p-4 sm:p-5");

/** Product listing card shell */
export const productCardShell = cn(
  cardBase,
  "group flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md"
);

/** Typography */
export const eyebrow =
  "text-xs font-black uppercase tracking-[0.18em] text-[#ff4f01]";

export const pageTitle =
  "text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl";

export const sectionTitle = "text-lg font-bold text-neutral-900 sm:text-xl";

export const bodyText = "text-sm leading-relaxed text-neutral-600";

export const helperText = "text-xs leading-relaxed text-neutral-500";

/** Hero / concept panels */
export const heroPanel = cn(
  cardBase,
  "border-[#ff4f01]/20 bg-gradient-to-br from-orange-50/90 via-white to-white p-5 sm:p-8 shadow-md ring-1 ring-[#ff4f01]/10"
);

/** Pill chips for filters */
export const filterChip = (active: boolean) =>
  cn(
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
    active
      ? "bg-[#ff4f01] text-white shadow-sm"
      : "border border-orange-100 bg-white text-neutral-600 hover:border-[#ff4f01]/40 hover:text-[#ff4f01]"
  );

/** Tab switcher (offers, etc.) */
export const tabSwitcher = "flex gap-1 rounded-2xl bg-orange-50/80 p-1 ring-1 ring-orange-100";

export const tabButton = (active: boolean) =>
  cn(
    "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
    active ? "bg-white text-[#ff4f01] shadow-sm" : "text-neutral-600 hover:text-[#ff4f01]"
  );
