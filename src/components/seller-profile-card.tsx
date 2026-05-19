import Link from "next/link";

import { StartChatButton } from "@/components/start-chat-button";
import { TrustBadge } from "@/components/trust-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatRatingAverage } from "@/lib/trust-score";
import type { PublicProfileView } from "@/lib/types/profile";
import { cn } from "@/lib/utils";

import { Shield, Star } from "lucide-react";

export type SellerProfileCardProps = {
  profile: PublicProfileView;
  viewerId: string | null;
  isOwner: boolean;
  productId?: string;
  className?: string;
};

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

export function SellerProfileCard({
  profile,
  viewerId,
  isOwner,
  productId,
  className,
}: SellerProfileCardProps) {
  const ratingText = formatRatingAverage(profile.rating_average, profile.rating_count);

  if (isOwner) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-[#fde8dc]/90 bg-[#fffaf7] px-4 py-4",
          className
        )}
      >
        <p className="text-sm font-semibold text-neutral-800">Bu ilan sana ait.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {productId ? (
            <Link
              href={`/products/${productId}/edit`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full border-0 bg-[#ff4f01] font-bold text-white hover:bg-[#e64700]"
              )}
            >
              Düzenle
            </Link>
          ) : null}
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full border-2 font-bold"
            )}
          >
            Profilime git
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#fde8dc]/90 bg-white/95 p-4 shadow-sm ring-1 ring-black/[0.03]",
        className
      )}
    >
      <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">İlan Sahibi</p>
      <div className="mt-3 flex gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff4f01]/20 to-orange-200/40 text-lg font-black text-[#ff4f01] ring-2 ring-[#ff4f01]/15">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-neutral-900">{profile.display_name}</p>
          {profile.location ? (
            <p className="mt-0.5 text-xs text-neutral-600">{profile.location}</p>
          ) : null}
          <p className="mt-1 text-xs text-neutral-500">
            Katılım: {formatJoinDate(profile.created_at)}
          </p>
          <div className="mt-2">
            <TrustBadge score={profile.trust_score} size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-neutral-700">
            <span className="inline-flex items-center gap-1">
              <Shield className="size-3.5 text-emerald-600" aria-hidden />
              Tamamlanan takas: {profile.completed_swaps}
            </span>
            {ratingText ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 text-amber-500" aria-hidden />
                Puan: {ratingText}
              </span>
            ) : null}
          </div>
          {profile.bio ? (
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-600">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StartChatButton
          otherUserId={profile.id}
          productId={productId}
          viewerId={viewerId}
          variant="default"
          size="sm"
        />
        <Link
          href={`/users/${profile.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-full border-2 font-bold"
          )}
        >
          Profilini Gör
        </Link>
      </div>
    </section>
  );
}
