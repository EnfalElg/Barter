import { redirect } from "next/navigation";

export default async function LegacyOfferRedirect({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = await params;
  redirect(`/offers/new?requestedProductId=${encodeURIComponent(targetId)}`);
}
