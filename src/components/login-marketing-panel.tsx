import {
  HeartHandshake,
  Lock,
  MessageCircle,
  Shield,
  Sparkles,
  Scale,
} from "lucide-react";

import { BARTER_TAGLINE } from "@/lib/barter-copy";

const FEATURES = [
  { icon: Lock, label: "Gizli değer sistemi" },
  { icon: Sparkles, label: "AI değer rozeti" },
  { icon: Scale, label: "Denk takas önerileri" },
  { icon: MessageCircle, label: "Güvenli teklif ve sohbet" },
] as const;

export function LoginMarketingPanel() {
  return (
    <section className="relative hidden flex-col justify-center border-b border-orange-100/80 bg-gradient-to-br from-[#fff7f2] via-orange-50/40 to-white px-8 py-12 lg:flex lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(255,79,1,0.12),transparent_55%)]"
      />
      <div className="relative max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4f01] to-orange-400 text-white shadow-lg shadow-orange-500/30">
            <HeartHandshake className="size-6" aria-hidden />
          </span>
          <span className="text-2xl font-black lowercase tracking-tight text-neutral-900">
            barter
          </span>
        </div>

        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4f01]">
          Takas pazarı
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-neutral-900 xl:text-5xl">
          {BARTER_TAGLINE}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          Ürünlerini satmaya uğraşmadan, değerine yakın ürünlerle güvenli takas yap.
        </p>

        <ul className="mt-10 space-y-4">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ff4f01] shadow-sm ring-1 ring-orange-100">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-neutral-800">{label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 flex items-start gap-2 rounded-2xl border border-orange-100/80 bg-white/70 px-4 py-3 text-xs leading-relaxed text-neutral-600 shadow-sm">
          <Shield className="mt-0.5 size-4 shrink-0 text-[#ff4f01]" aria-hidden />
          <span>Ürün değerleri diğer kullanıcılara gösterilmez — yalnızca denk takas için kullanılır.</span>
        </p>
      </div>
    </section>
  );
}
