import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { BARTER_TAGLINE } from "@/lib/barter-copy";
import { cn } from "@/lib/utils";

import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Demo Rehberi",
};

const STEPS = [
  { n: 1, title: "Ürün ekle", href: "/post", body: "İlanını yayınla ve değerini gizli tut." },
  {
    n: 2,
    title: "AI değer rozeti al",
    href: "/post",
    body: "Kayıt sonrası AI yalnızca denge kontrolü ve rozet üretir.",
  },
  {
    n: 3,
    title: "Önerileri gör",
    href: "/recommendations",
    body: "Ürünlerini seç, denk takas adaylarını keşfet.",
  },
  {
    n: 4,
    title: "Teklif gönder",
    href: "/discover",
    body: "Beğendiğin ilana takas teklifi oluştur.",
  },
  {
    n: 5,
    title: "Sohbet başlat",
    href: "/chat",
    body: "Detayları ilan sahibiyle konuş.",
  },
  {
    n: 6,
    title: "Takası tamamla",
    href: "/offers",
    body: "Teklifi kabul et ve tamamlandı olarak işaretle.",
  },
  {
    n: 7,
    title: "Değerlendir",
    href: "/offers",
    body: "Tamamlanan takastan sonra güven puanı ver.",
  },
] as const;

export default function DemoGuidePage() {
  if (process.env.NODE_ENV === "production" && !process.env.DEMO_GUIDE_ENABLED) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-neutral-600">
        Demo rehberi yalnızca geliştirme ortamında kullanılabilir.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-5">
      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-wider text-[#ff4f01]">
          Demo
        </p>
        <h1 className="mt-1 text-3xl font-black text-neutral-900">Takas yolculuğu</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {BARTER_TAGLINE} Aşağıdaki adımları sırayla dene.
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950 ring-1 ring-amber-200">
          Demo verisi: <code className="font-mono">npm run seed:demo</code> — şifre:{" "}
          <strong>Demo123456!</strong>
        </p>
      </header>

      <ol className="list-none space-y-3 p-0">
        {STEPS.map((s) => (
          <li key={s.n}>
            <Link
              href={s.href}
              className="flex gap-4 rounded-2xl border border-white/90 bg-white p-4 shadow-sm ring-1 ring-black/[0.04] transition hover:border-[#ff4f01]/30"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ff4f01]/10 text-sm font-black text-[#ff4f01]">
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold text-neutral-900">
                  <CheckCircle2 className="size-4 text-[#ff4f01]/60" aria-hidden />
                  {s.title}
                </p>
                <p className="mt-1 text-sm text-neutral-600">{s.body}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonVariants({ className: "rounded-2xl" })}>
          Ana sayfa
        </Link>
        <Link
          href="/discover"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-2xl font-bold"
          )}
        >
          Keşfet
        </Link>
      </div>
    </div>
  );
}
