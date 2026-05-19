import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OffersListClient } from "@/app/offers/offers-list-client";
import { loadOffersPageData } from "@/lib/offers-list.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Takas Teklifleri",
};

export default async function OffersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/offers")}`);
  }

  const { incoming, outgoing } = await loadOffersPageData(user.id);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Takas
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">
          Teklifler
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Gelen ve giden takas tekliflerini yönet. Fiyatlar gösterilmez.
        </p>
        <Link
          href="/discover"
          className="mt-4 inline-block text-sm font-bold text-[#ff4f01] underline-offset-4 hover:underline"
        >
          Keşfet’e dön
        </Link>
      </header>

      <Suspense fallback={<div className="text-sm text-neutral-500">Yükleniyor…</div>}>
        <OffersListClient
          incoming={incoming}
          outgoing={outgoing}
          viewerId={user.id}
        />
      </Suspense>
    </div>
  );
}
