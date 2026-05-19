import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileLocationSection } from "@/app/profile/profile-location-section";
import { ProfileProductList } from "@/app/profile/profile-product-list";
import { ProfileWishlistSection } from "@/app/profile/profile-wishlist-section";
import { TrustBadge } from "@/components/trust-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ensureOwnProfileFromAuthUser, fetchPublicProfile } from "@/lib/profiles.server";
import { formatRatingAverage } from "@/lib/trust-score";
import { sanitizeOwnerProduct } from "@/lib/product-value";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OwnerProduct } from "@/lib/types/product";

export const metadata = {
  title: "Profilim",
};

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile")}`);
  }

  await ensureOwnProfileFromAuthUser(user);
  const ownProfile = await fetchPublicProfile(user.id);

  const { data: rows, error } = await supabase
    .from("products")
    .select("*")
    .eq("owner_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-5">
        <div className="rounded-2xl border border-red-100 bg-red-50/90 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-red-800">
            Ürünlerin yüklenirken bir hata oluştu.
          </p>
        </div>
      </div>
    );
  }

  const products: OwnerProduct[] = (rows ?? []).map((r) =>
    sanitizeOwnerProduct(r as Record<string, unknown>)
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(255,79,1,0.12),transparent_50%),linear-gradient(180deg,#fff7f2_0%,#faf9f7_45%,#fffdfb_100%)]"
      />

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-5 sm:py-10">
        <header className="mb-8 border-b border-[#fde8dc]/80 pb-6">
          <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
            Hesabım
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-neutral-900">
            Profilim
          </h1>
          <p className="mt-2 max-w-md text-sm text-neutral-600">
            Yayınladığın ürünleri buradan yönet; değer bilgileri sadece sana görünür.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <TrustBadge score={ownProfile.trust_score} size="md" />
            <span className="text-sm font-semibold text-neutral-600">
              Tamamlanan takas: {ownProfile.completed_swaps}
            </span>
            {formatRatingAverage(ownProfile.rating_average, ownProfile.rating_count) ? (
              <span className="text-sm font-semibold text-neutral-600">
                Puan: {formatRatingAverage(ownProfile.rating_average, ownProfile.rating_count)}
              </span>
            ) : null}
          </div>
        </header>

        <section className="mb-8 rounded-3xl border border-[#ff4f01]/20 bg-gradient-to-br from-white/95 to-[#fff7f2]/90 p-5 shadow-md ring-1 ring-[#ff4f01]/10">
          <h2 className="text-base font-black text-neutral-900">Elindekilerle ne alabilirsin?</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Ürünlerini seç, sana denk takas adaylarını önerelim.
          </p>
          <Link
            href="/recommendations"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-4 inline-flex rounded-2xl border-0 bg-[#ff4f01] font-black text-white shadow-lg hover:bg-[#e64700]"
            )}
          >
            Önerileri Gör
          </Link>
        </section>

        <ProfileLocationSection initialLocation={ownProfile.location} />

        <ProfileWishlistSection
          initial={{
            wanted_categories: ownProfile.wanted_categories,
            wanted_keywords: ownProfile.wanted_keywords,
          }}
        />

        <section>
          <ProfileProductList
            key={products.map((p) => p.id).sort().join(",")}
            initialProducts={products}
          />
        </section>
      </div>
    </div>
  );
}
