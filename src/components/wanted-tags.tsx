import { cn } from "@/lib/utils";

export type WantedTagsProps = {
  categories?: string[];
  keywords?: string[];
  emptyLabel?: string;
  className?: string;
};

export function WantedTags({
  categories = [],
  keywords = [],
  emptyLabel = "Belirli bir tercih belirtilmemiş.",
  className,
}: WantedTagsProps) {
  const cats = categories.filter(Boolean);
  const keys = keywords.filter(Boolean);

  if (cats.length === 0 && keys.length === 0) {
    return <p className={cn("text-sm text-neutral-500", className)}>{emptyLabel}</p>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {cats.map((c) => (
        <span
          key={`cat-${c}`}
          className="rounded-full border border-[#ff4f01]/25 bg-[#fff0e8] px-2.5 py-0.5 text-[11px] font-bold text-[#c2410c]"
        >
          {c}
        </span>
      ))}
      {keys.map((k) => (
        <span
          key={`kw-${k}`}
          className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-700"
        >
          {k}
        </span>
      ))}
    </div>
  );
}
