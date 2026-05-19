"use client";

import { Loader2, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "magic" | "password";

export function LoginForm({ defaultNext }: { defaultNext: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwTab, setPwTab] = useState<"signin" | "signup">("signin");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextPath =
    searchParams.get("next") ?? defaultNext ?? "/";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/";

  const redirectOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const em = email.trim();
    if (!em) {
      setError("E-posta adresini gir.");
      return;
    }
    setLoading(true);
    try {
      const callback = new URL("/auth/callback", redirectOrigin);
      callback.searchParams.set("next", safeNext);

      const { error: err } = await supabase.auth.signInWithOtp({
        email: em,
        options: {
          emailRedirectTo: callback.toString(),
        },
      });
      if (err) throw err;
      setMessage(
        "Giriş linki e-postana gönderildi. Kutunu kontrol et (spam klasörüne de bak)."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const onPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const em = email.trim();
    if (!em || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    if (pwTab === "signup" && password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      if (pwTab === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: em,
          password,
        });
        if (err) throw err;
      } else {
        const callback = new URL("/auth/callback", redirectOrigin);
        callback.searchParams.set("next", safeNext);
        const { data, error: err } = await supabase.auth.signUp({
          email: em,
          password,
          options: {
            emailRedirectTo: callback.toString(),
          },
        });
        if (err) throw err;
        if (data.session) {
          router.refresh();
          router.push(safeNext);
          return;
        }
        setMessage(
          "Hesap oluşturuldu. Onay için e-postanı kontrol et veya doğrudan giriş yap."
        );
        setLoading(false);
        return;
      }
      router.refresh();
      router.push(safeNext);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  const decodedUrlError =
    urlError != null && urlError !== "missing_code"
      ? (() => {
          try {
            return decodeURIComponent(urlError);
          } catch {
            return urlError;
          }
        })()
      : null;
  const displayError = error || decodedUrlError;

  if (!supabase) {
    return (
      <div className="w-full max-w-md rounded-[1.75rem] border border-amber-200 bg-white p-8 text-center shadow-lg ring-1 ring-black/[0.04]">
        <p className="text-sm leading-relaxed text-neutral-700">
          Giriş için{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          ve{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          ortam değişkenlerini ekleyin.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4f01] to-orange-400 text-white shadow-lg shadow-orange-500/35">
          <Sparkles className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          Welcome back!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Takasa devam etmek için giriş yap — sihirli link veya şifre ile.
        </p>
      </div>

      <div
        className={cn(
          "rounded-[1.75rem] border border-white/90 bg-white p-6 shadow-[0_20px_50px_-20px_rgba(255,79,1,0.25)] ring-1 ring-black/[0.05] sm:p-8"
        )}
      >
        <div className="mb-6 flex rounded-2xl bg-[#fff5f0] p-1 ring-1 ring-[#ff4f01]/10">
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-bold transition",
              mode === "magic"
                ? "bg-[#ff4f01] text-white shadow-md"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            Sihirli link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-bold transition",
              mode === "password"
                ? "bg-[#ff4f01] text-white shadow-md"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            E-posta & şifre
          </button>
        </div>

        {displayError ? (
          <p
            className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700 ring-1 ring-red-100"
            role="alert"
          >
            {displayError}
          </p>
        ) : null}

        {message ? (
          <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-800 ring-1 ring-emerald-100">
            {message}
          </p>
        ) : null}

        {mode === "magic" ? (
          <form onSubmit={onMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email" className="text-neutral-700">
                E-posta
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="magic-email"
                  type="email"
                  autoComplete="email"
                  placeholder="sen@ornek.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-2xl border-neutral-200 bg-[#fffaf7] pl-10 text-base focus-visible:ring-[#ff4f01]/30"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#ff4f01] text-base font-bold text-white shadow-[0_10px_28px_-8px_rgba(255,79,1,0.55)] hover:bg-[#e64700]"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                "Giriş linki gönder"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={onPasswordAuth} className="space-y-4">
            <div className="flex gap-2 rounded-xl bg-neutral-100 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-bold sm:text-sm",
                  pwTab === "signin"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500"
                )}
                onClick={() => setPwTab("signin")}
              >
                Giriş yap
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-bold sm:text-sm",
                  pwTab === "signup"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500"
                )}
                onClick={() => setPwTab("signup")}
              >
                Kayıt ol
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="pw-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-2xl border-neutral-200 bg-[#fffaf7] pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-password">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="pw-password"
                  type="password"
                  autoComplete={
                    pwTab === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl border-neutral-200 bg-[#fffaf7] pl-10"
                />
              </div>
            </div>
            {pwTab === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="pw-confirm">Şifre tekrar</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-2xl border-neutral-200 bg-[#fffaf7]"
                />
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#ff4f01] text-base font-bold text-white shadow-[0_10px_28px_-8px_rgba(255,79,1,0.55)] hover:bg-[#e64700]"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : pwTab === "signin" ? (
                "Giriş yap"
              ) : (
                "Hesap oluştur"
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-neutral-500">
          Devam ederek{" "}
          <Link href="/" className="font-semibold text-[#ff4f01] underline-offset-2 hover:underline">
            kullanım şartlarını
          </Link>{" "}
          kabul etmiş olursun.
        </p>
      </div>

      <p className="text-center text-sm text-neutral-500">
        <Link
          href="/"
          className="font-semibold text-neutral-700 hover:text-[#ff4f01]"
        >
          ← Ana sayfa
        </Link>
      </p>
    </div>
  );
}
