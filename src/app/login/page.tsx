import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { LoginMarketingPanel } from "@/components/login-marketing-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Giriş",
  description: "barter — Fiyat yok, denge var. Giriş yap ve takasa başla.",
};

function LoginFallback() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Skeleton className="h-10 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-white">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <LoginMarketingPanel />

        <div className="flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
          <Suspense fallback={<LoginFallback />}>
            <LoginForm defaultNext={defaultNext} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
