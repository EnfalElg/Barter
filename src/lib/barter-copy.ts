/** Shared barter-first microcopy (no public prices). */

export const BARTER_TAGLINE = "Fiyat yok, denge var.";

export const BARTER_SUPPORTING =
  "Ürün değerleri gizli tutulur. Sistem sadece denk takasları bulmak için arka planda kullanır.";

export const BARTER_SUPPORTING_SHORT = "Değerler gizli, takas dengesi açık.";

export const BARTER_DISCOVER_BODY =
  "Ürün değerleri gizli tutulur. Sen ürünleri ihtiyacına, güven skoruna ve takas dengesine göre değerlendirirsin.";

export const BARTER_OFFER_TOP =
  "Bu teklifte fiyatlar gösterilmez. Takas dengesi arka planda hesaplanır.";

export const BARTER_BALANCE_EXPLANATION =
  "Bu etiket, seçilen ürünlerin gizli değer sinyallerine göre hesaplanır.";

export const BARTER_RECOMMENDATIONS_SUBTITLE =
  "Ürünlerini seç, sistem arka planda değer dengesine ve tercih uyumuna göre öneriler sunsun. Fiyatlar gizli kalır.";

export const BARTER_MATCHES_SUBTITLE =
  "Bu alanda seçtiğin ürünle benzer değer bandındaki ürünleri görürsün. Fiyatlar gizlenir; denge arka planda hesaplanır.";

export const BARTER_AI_CHECK_NOTE =
  "AI bu değeri yalnızca denge kontrolü için değerlendirir.";

export const BARTER_VALUE_HIDDEN_OWNER =
  "Bu değer sadece sana görünür.";

export const BARTER_VALUE_HIDDEN_PUBLIC =
  "Bu değer gizlidir. Diğer kullanıcılar bu değeri görmez; sistem sadece denk takasları bulmak için kullanır.";

/** Qualitative barter balance label for public UI. */
export function formatBarterBalanceLabel(label: string): string {
  const t = label.trim();
  if (!t) return "Takas dengesi: —";
  if (t.toLowerCase().startsWith("takas dengesi")) return t;
  return `Takas dengesi: ${t}`;
}
