"use client";

import {
  Compass,
  HeartHandshake,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BARTER_TAGLINE } from "@/lib/barter-copy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "magic" | "password";

const TRUST_ITEMS = [
  "Kendi ürünlerini yayınla",
  "Denk takas önerileri al",
  "Teklif gönder ve sohbet başlat",
  "Takas geçmişinle güven skorunu artır",
] as const;

const inputClass =
  "h-12 rounded-2xl border-orange-100/80 bg-[#fffaf7] pl-10 text-base focus-visible:border-[#ff4f01]/50 focus-visible:ring-[#ff4f01]/25";

function mapAuthError(err: unknown, context: "signin" | "signup" | "magic"): string {
  if (!(err instanceof Error)) {
    return context === "signin" ? "E-posta veya şifre hatalı." : "İşlem başarısız.";
  }
  const msg = err.message.toLowerCase();
  if (
    context === "signin" &&
    (msg.includes("invalid login") ||
      msg.includes("invalid credentials") ||
      msg.includes("invalid email or password"))
  ) {
    return "E-posta veya şifre hatalı.";
  }
  if (msg.includes("user already registered")) {
    return "Bu e-posta ile zaten bir hesap var.";
  }
  if (msg.includes("password") && msg.includes("least")) {
    return "Şifre en az 6 karakter olmalıdır.";
  }
  return err.message;
}

function DemoHint() {
  const hint = process.env.NEXT_PUBLIC_DEMO_LOGIN_HINT?.trim();
  const enabled = process.env.NEXT_PUBLIC_DEMO_GUIDE_ENABLED === "true";
  if (!hint && !enabled) return null;

  return (
    <p className="rounded-2xl border border-dashed border-orange-200/90 bg-orange-50/50 px-3 py-2.5 text-center text-xs leading-relaxed text-neutral-600">
      {hint ??
        "Demo için test hesabı kullanabilirsin. Hesaplar seed script ile oluşturulur."}
    </p>
  );
}

export function LoginForm({ defaultNext }: { defaultNext: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwTab, setPwTab] = useState<"signin" | "signup">("signin");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextPath = searchParams.get("next") ?? defaultNext ?? "/";
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
      setMessage("Giriş bağlantısı e-postana gönderildi.");
    } catch (err: unknown) {
      setError(mapAuthError(err, "magic"));
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
      setError(mapAuthError(err, pwTab === "signin" ? "signin" : "signup"));
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
      <div className="mx-auto w-full max-w-md rounded-3xl border border-amber-200 bg-white/90 p-8 text-center shadow-xl shadow-orange-100/40">
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* Top chrome */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-black tracking-tight text-neutral-900"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4f01] to-orange-400 text-white shadow-md shadow-orange-500/25">
            <HeartHandshake className="size-4" aria-hidden />
          </span>
          <span className="text-lg lowercase lg:hidden">barter</span>
        </Link>
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-[#ff4f01]/40 hover:text-[#ff4f01]"
        >
          <Compass className="size-3.5" aria-hidden />
          Keşfet&apos;e dön
        </Link>
      </header>

      {/* Mobile marketing headline */}
      <div className="mb-6 lg:hidden">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff4f01]">
          Takas pazarı
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
          {BARTER_TAGLINE}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Değerine yakın ürünlerle güvenli takas yap — fiyatlar gizli kalır.
        </p>
      </div>

      {/* Auth card */}
      <div
        className={cn(
          "rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-xl shadow-orange-100/40 sm:p-8"
        )}
      >
        <div className="mb-6 text-center sm:text-left">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
            Hesabına giriş yap
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            Takas tekliflerini, sohbetlerini ve ürünlerini yönetmek için giriş yap.
          </p>
        </div>

        <div className="mb-5 flex rounded-2xl bg-orange-50/80 p-1 ring-1 ring-orange-100">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setError(null);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
              mode === "password"
                ? "bg-[#ff4f01] text-white shadow-sm"
                : "text-neutral-600 hover:text-[#ff4f01]"
            )}
          >
            E-posta & şifre
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition",
              mode === "magic"
                ? "bg-[#ff4f01] text-white shadow-sm"
                : "text-neutral-600 hover:text-[#ff4f01]"
            )}
          >
            Sihirli bağlantı
          </button>
        </div>

        {displayError ? (
          <p
            className="mb-4 rounded-2xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100"
            role="alert"
          >
            {displayError}
          </p>
        ) : null}

        {message ? (
          <p
            className="mb-4 rounded-2xl bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-900 ring-1 ring-emerald-100"
            role="status"
          >
            {message}
          </p>
        ) : null}

        {mode === "magic" ? (
          <form onSubmit={onMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email" className="text-sm font-semibold text-neutral-700">
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
                  className={inputClass}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              variant="barter"
              size="barter"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Gönderiliyor...
                </>
              ) : (
                "Sihirli bağlantı gönder"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={onPasswordAuth} className="space-y-4">
            <div className="flex gap-2 rounded-xl bg-neutral-100/80 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold sm:text-sm",
                  pwTab === "signin"
                    ? "bg-white text-[#ff4f01] shadow-sm"
                    : "text-neutral-500"
                )}
                onClick={() => setPwTab("signin")}
              >
                Giriş yap
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold sm:text-sm",
                  pwTab === "signup"
                    ? "bg-white text-[#ff4f01] shadow-sm"
                    : "text-neutral-500"
                )}
                onClick={() => setPwTab("signup")}
              >
                Kayıt ol
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw-email" className="text-sm font-semibold text-neutral-700">
                E-posta
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="pw-email"
                  type="email"
                  autoComplete="email"
                  placeholder="sen@ornek.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-password" className="text-sm font-semibold text-neutral-700">
                Şifre
              </Label>
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
                  className={inputClass}
                />
              </div>
            </div>
            {pwTab === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="pw-confirm" className="text-sm font-semibold text-neutral-700">
                  Şifre tekrar
                </Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-2xl border-orange-100/80 bg-[#fffaf7]"
                />
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              variant="barter"
              size="barter"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Giriş yapılıyor...
                </>
              ) : pwTab === "signin" ? (
                "Giriş Yap"
              ) : (
                "Kayıt ol"
              )}
            </Button>

            {pwTab === "signin" ? (
              <p className="text-center text-sm text-neutral-600">
                Hesabın yok mu?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#ff4f01] hover:underline"
                  onClick={() => setPwTab("signup")}
                >
                  Kayıt ol
                </button>
              </p>
            ) : (
              <p className="text-center text-sm text-neutral-600">
                Zaten hesabın var mı?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#ff4f01] hover:underline"
                  onClick={() => setPwTab("signin")}
                >
                  Giriş yap
                </button>
              </p>
            )}
          </form>
        )}

        {mode === "magic" ? (
          <p className="mt-4 text-center text-sm text-neutral-600">
            Şifre ile giriş yapmak için{" "}
            <button
              type="button"
              className="font-semibold text-[#ff4f01] hover:underline"
              onClick={() => setMode("password")}
            >
              e-posta & şifre
            </button>{" "}
            sekmesine geç.
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-orange-100/80 bg-orange-50/40 p-4">
          <p className="text-sm font-bold text-neutral-900">Neden giriş yapmalısın?</p>
          <ul className="mt-3 space-y-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                <Sparkles className="size-3.5 shrink-0 text-[#ff4f01]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-neutral-600">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-[#ff4f01]" aria-hidden />
            Ürün değerleri diğer kullanıcılara gösterilmez.
          </p>
        </div>

        <div className="mt-4">
          <DemoHint />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Devam ederek{" "}
          <Link
            href="/"
            className="font-semibold text-[#ff4f01] underline-offset-2 hover:underline"
          >
            kullanım şartlarını
          </Link>{" "}
          kabul etmiş olursun.
        </p>
      </div>
    </div>
  );
}
