"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StartChatButtonProps = {
  otherUserId: string;
  productId?: string;
  viewerId: string | null;
  label?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
  loginNext?: string;
};

export function StartChatButton({
  otherUserId,
  productId,
  viewerId,
  label = "Sohbet Başlat",
  variant = "outline",
  size = "sm",
  className,
  loginNext,
}: StartChatButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!viewerId || viewerId === otherUserId) {
    return null;
  }

  const start = async () => {
    if (!viewerId) {
      const next = loginNext ?? (typeof window !== "undefined" ? window.location.pathname : "/discover");
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          other_user_id: otherUserId,
          product_id: productId,
        }),
      });
      const body = (await res.json()) as {
        redirect_url?: string;
        thread_id?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Sohbet başlatılamadı");
      }
      router.push(body.redirect_url ?? `/chat/${body.thread_id}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Sohbet başlatılamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant === "outline" ? "barterGhost" : "barter"}
      size={size}
      disabled={busy}
      onClick={() => void start()}
      className={cn("w-full", className)}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <MessageCircle className="size-4 shrink-0" aria-hidden />
      )}
      <span className="ml-1.5">{label}</span>
    </Button>
  );
}

export function StartChatLink({
  otherUserId,
  productId,
  viewerId,
  className,
}: Pick<StartChatButtonProps, "otherUserId" | "productId" | "viewerId" | "className">) {
  if (!viewerId || viewerId === otherUserId) return null;
  return (
    <StartChatButton
      otherUserId={otherUserId}
      productId={productId}
      viewerId={viewerId}
      label="Sohbet"
      variant="outline"
      size="sm"
      className={className}
    />
  );
}
