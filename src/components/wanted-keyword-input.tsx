"use client";

import { useCallback, useState } from "react";

import { Input } from "@/components/ui/input";
import { MAX_WANTED_KEYWORDS } from "@/lib/wanted";
import { cn } from "@/lib/utils";

import { X } from "lucide-react";

export type WantedKeywordInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function WantedKeywordInput({
  value,
  onChange,
  disabled,
  className,
}: WantedKeywordInputProps) {
  const [draft, setDraft] = useState("");

  const addTokens = useCallback(
    (raw: string) => {
      const parts = raw
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 0) return;
      const merged = [...value];
      for (const p of parts) {
        if (merged.length >= MAX_WANTED_KEYWORDS) break;
        const key = p.toLocaleLowerCase("tr-TR");
        if (merged.some((x) => x.toLocaleLowerCase("tr-TR") === key)) continue;
        merged.push(p);
      }
      onChange(merged);
      setDraft("");
    },
    [onChange, value]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTokens(draft);
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTokens(draft);
          }}
          disabled={disabled || value.length >= MAX_WANTED_KEYWORDS}
          placeholder="Örn. kahve makinesi, Kindle"
          className="min-h-11 flex-1 rounded-2xl border-neutral-200/90 bg-[#fffaf7]"
        />
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 p-0">
          {value.map((kw) => (
            <li key={kw}>
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-black/[0.05]">
                {kw}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((x) => x !== kw))}
                  className="rounded-full p-0.5 hover:bg-neutral-200"
                  aria-label={`${kw} kaldır`}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
