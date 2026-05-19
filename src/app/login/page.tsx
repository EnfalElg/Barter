import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Giriş",
  description: "barter — giriş yap veya kayıt ol",
};

function LoginFallback() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[1.75rem] border border-white/90 bg-white p-8 shadow-xl">
      <Skeleton className="size-14 rounded-2xl" />
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-4 w-full max-w-xs rounded-lg" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const defaultNext = sp.next?.startsWith("/") ? sp.next : "/";

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col items-center justify-center px-4 py-12 sm:min-h-[calc(100vh-4rem)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,79,1,0.15),transparent_55%),linear-gradient(180deg,#faf9f7_0%,#fffdfb_50%,#fff5f0_100%)]"
      />
      <Suspense fallback={<LoginFallback />}>
        <LoginForm defaultNext={defaultNext} />
      </Suspense>
    </div>
  );
}
