import { cn } from "@/lib/utils";

export type PrivateValueNoteProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function PrivateValueNote({ variant = "compact", className }: PrivateValueNoteProps) {
  if (variant === "compact") {
    return (
      <p
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold text-neutral-600",
          className
        )}
      >
        <span aria-hidden>🔒</span>
        Değer gizli
      </p>
    );
  }

  return (
    <p
      className={cn(
        "rounded-xl bg-neutral-50/90 px-3 py-2 text-xs leading-relaxed text-neutral-600 ring-1 ring-black/[0.04]",
        className
      )}
    >
      <span className="mr-1" aria-hidden>
        🔒
      </span>
      Bu ürünün değeri diğer kullanıcılara gösterilmez. Sistem yalnızca denk takasları bulmak
      için kullanır.
    </p>
  );
}
