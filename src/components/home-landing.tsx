import { ArrowRight, LineChart, MapPinned, Shield } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BARTER_TAGLINE } from "@/lib/barter-copy";
import { cn } from "@/lib/utils";

const pillars = [
  {
    title: "Gizli değer + AI rozet",
    body: "Sen değeri belirlersin; AI yalnızca makullük rozeti üretir. Rakamlar herkese açık listelenmez.",
    icon: LineChart,
  },
  {
    title: "Denk takas alanı",
    body: "Benzer değer bandında eşleşme arka planda hesaplanır; rakamlar gizli kalır.",
    icon: Shield,
  },
  {
    title: "Konum rozetleri",
    body: "Yürüme mesafesi ve şehir etiketleri — mobil öncelikli keşif.",
    icon: MapPinned,
  },
] as const;

const cardPop =
  "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(255,79,1,0.08)]";

export function HomeLanding() {
  return (
    <div className="flex flex-1 flex-col bg-[#faf9f7]">
      <section className="border-b border-[#fde8dc]/80 bg-gradient-to-b from-[#fff2eb] via-[#faf9f7] to-[#f8f4ff]">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:gap-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="max-w-xl space-y-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4f01]">
              Takas · hackathon
            </p>
            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
              {BARTER_TAGLINE}
            </h1>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              Kullanmadığın ürünleri satmaya uğraşmadan, değerine yakın ürünlerle takas et.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/discover"
                className={buttonVariants({ size: "lg", className: "gap-2" })}
              >
                Keşfet
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/post"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                })}
              >
                Ürün Ekle
              </Link>
            </div>
          </div>
          <Card
            className={cn(
              "w-full max-w-md rounded-3xl border-white/90 bg-white p-6 sm:p-8 lg:max-w-sm",
              cardPop,
              "ring-1 ring-black/[0.06]"
            )}
          >
            <CardHeader className="gap-4 p-0">
              <CardTitle className="text-lg font-bold leading-snug">
                Demo hazır
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Masonry keşif, yumuşak rozetler ve denk takas alanı — Supabase yoksa mock
                envanterle çalışır.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="border-t border-[#f0ebe6]/90 bg-[#faf9f7] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-center text-sm font-black uppercase tracking-[0.18em] text-[#ff4f01] sm:text-left">
            Öne çıkanlar
          </h2>
          <p className="mb-10 max-w-2xl text-center text-muted-foreground sm:mx-0 sm:text-left">
            Üç temel özellik — her ekranda rahat okunur kartlar.
          </p>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-8">
            {pillars.map(({ title, body, icon: Icon }) => (
              <li key={title} className="min-h-0 list-none">
                <Card
                  className={cn(
                    "flex h-full min-h-[220px] flex-col rounded-3xl border border-white/90 bg-white p-6 sm:p-8",
                    cardPop,
                    "ring-1 ring-black/[0.05] transition-transform duration-200 hover:-translate-y-0.5"
                  )}
                >
                  <div className="mb-5 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff4f01]/10 text-[#ff4f01] shadow-inner">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <CardTitle className="mb-3 text-lg font-bold leading-snug tracking-tight text-foreground">
                    {title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed text-muted-foreground">
                    {body}
                  </CardDescription>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
