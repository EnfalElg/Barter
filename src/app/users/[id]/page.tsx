import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { StartChatButton } from "@/components/start-chat-button";
import { TrustBadge } from "@/components/trust-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  fetchPublicProfile,
  fetchRecentRatings,
  fetchUserAvailableProducts,
} from "@/lib/profiles.server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatRatingAverage } from "@/lib/trust-score";
import { buildViewerLocation } from "@/lib/viewer-location";
import { cn } from "@/lib/utils";

import { Shield, Star } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await fetchPublicProfile(id);
  return {
    title: profile.display_name,
  };
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || id.length < 8) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, products, recentRatings] = await Promise.all([
    fetchPublicProfile(id),
    fetchUserAvailableProducts(id),
    fetchRecentRatings(id, 5),
  ]);

  const isSelf = Boolean(user?.id && user.id === id);

  const viewerProfile = user?.id ? await fetchPublicProfile(user.id) : null;
  const viewer = buildViewerLocation({
    profileLocation: viewerProfile?.location ?? null,
  });

  const ratingText = formatRatingAverage(profile.rating_average, profile.rating_count);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Satıcı profili
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">
          {profile.display_name}
        </h1>
      </header>

      <section className="mb-10 rounded-3xl border border-[#fde8dc]/90 bg-white/95 p-6 shadow-md ring-1 ring-black/[0.04]">
        {isSelf ? (
          <p className="mb-4 text-sm font-semibold text-neutral-800">Bu senin profilin.</p>
        ) : null}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff4f01]/20 to-orange-200/40 text-2xl font-black text-[#ff4f01] ring-2 ring-[#ff4f01]/15">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-neutral-900">{profile.display_name}</p>
            {profile.location ? (
              <p className="mt-1 text-sm text-neutral-600">{profile.location}</p>
            ) : null}
            {profile.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">{profile.bio}</p>
            ) : null}
            <div className="mt-4">
              <TrustBadge score={profile.trust_score} size="md" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-neutral-700">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="size-4 text-emerald-600" aria-hidden />
                Tamamlanan takas: {profile.completed_swaps}
              </span>
              {ratingText ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 text-amber-500" aria-hidden />
                  Puan: {ratingText}
                  <span className="font-normal text-neutral-500">
                    ({profile.rating_count} değerlendirme)
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {isSelf ? (
            <Link
              href="/profile"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full border-0 bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
              )}
            >
              Profilim
            </Link>
          ) : (
            <StartChatButton
              otherUserId={id}
              viewerId={user?.id ?? null}
              variant="default"
              size="sm"
            />
          )}
        </div>
      </section>

      {recentRatings.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-neutral-900">Son değerlendirmeler</h2>
          <ul className="flex list-none flex-col gap-3 p-0">
            {recentRatings.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-neutral-100 bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.03]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-amber-600">
                    {"★".repeat(r.score)}
                    <span className="text-neutral-300">{"★".repeat(5 - r.score)}</span>
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                {r.comment ? (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{r.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-black text-neutral-900">Yayındaki ilanlar</h2>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-12 text-center text-sm text-neutral-600">
            Bu kullanıcının yayında ilanı yok.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                viewer={viewer}
                viewerUserId={user?.id ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
