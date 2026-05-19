/**
 * Local / demo-only Supabase seed: demo auth users + products.
 *
 * SAFETY: Uses SUPABASE_SERVICE_ROLE_KEY — never ship this key to the client,
 * never commit it, and never run this script against production unless you intend to.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run seed:demo
 * If tsx is missing: npm install -D tsx
 *
 * Seeds: 6 demo users (Ayşe…Elif), 48 products, profiles, swap offers (pending/
 * accepted/completed/rejected), ratings, favorites, chat, notifications for Ayşe.
 * Clears prior demo-seed products and demo-only rows for those users before insert.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const DEMO_PASSWORD = "Demo123456!";

/** Six primary demo personas — seed also clears auxiliary rows for these users only. */
const DEMO_ACCOUNTS = [
  { email: "ayse.demo@example.com", full_name: "Ayşe" },
  { email: "mehmet.demo@example.com", full_name: "Mehmet" },
  { email: "zeynep.demo@example.com", full_name: "Zeynep" },
  { email: "emre.demo@example.com", full_name: "Emre" },
  { email: "deniz.demo@example.com", full_name: "Deniz" },
  { email: "elif.demo@example.com", full_name: "Elif" },
] as const;

const CATEGORIES = [
  "Elektronik",
  "Ev & Yaşam",
  "Kitap & Hobi",
  "Spor",
  "Giyim",
  "Oyun & Konsol",
  "Müzik",
  "Kamp & Outdoor",
] as const;

const LOCATIONS = [
  "Ankara / Çankaya",
  "Ankara / Bahçelievler",
  "İstanbul / Kadıköy",
  "İstanbul / Beşiktaş",
  "İzmir / Bornova",
  "Bursa / Nilüfer",
  "Eskişehir / Tepebaşı",
  "Antalya / Muratpaşa",
] as const;

const CONDITIONS = [
  "Yeni / kapalı kutu",
  "Az kullanılmış",
  "İyi",
  "Yıpranmış",
] as const;

const BASE_TITLES = [
  "Sony Bluetooth Kulaklık",
  "Mekanik Klavye",
  "Filtre Kahve Makinesi",
  "Kindle E-Kitap Okuyucu",
  "Kitap Seti",
  "Akıllı Saat",
  "Nintendo Switch Oyunu",
  "PS4 Oyun Seti",
  "Kamp Sandalyesi",
  "Spor Çantası",
  "Deri Cüzdan",
  "Bluetooth Hoparlör",
  "Gitar",
  "Yoga Matı",
  "Airfryer",
  "Masa Lambası",
  "Monitör",
  "Mouse",
  "Sırt Çantası",
  "Koşu Ayakkabısı",
  "Bisiklet Kaskı",
  "Puzzle Seti",
  "Plak Koleksiyonu",
  "Tablet Kalemi",
  "Oyuncu Kulaklığı",
  "Kahve Öğütücü",
  "Mini Projektör",
  "Dambıl Seti",
  "Çizim Tableti",
  "Fotoğraf Makinesi Çantası",
] as const;

type BadgeProfile = {
  ai_value_status: string;
  ai_badge_label: string;
  ai_badge_color: string;
};

const BADGE_PROFILES: BadgeProfile[] = [
  {
    ai_value_status: "fair",
    ai_badge_label: "Makul değer",
    ai_badge_color: "green",
  },
  {
    ai_value_status: "slightly_low",
    ai_badge_label: "Biraz düşük olabilir",
    ai_badge_color: "yellow",
  },
  {
    ai_value_status: "very_low",
    ai_badge_label: "Çok düşük olabilir",
    ai_badge_color: "orange",
  },
  {
    ai_value_status: "slightly_high",
    ai_badge_label: "Biraz yüksek olabilir",
    ai_badge_color: "red",
  },
  {
    ai_value_status: "very_high",
    ai_badge_label: "Çok yüksek olabilir",
    ai_badge_color: "dark_red",
  },
  {
    ai_value_status: "unknown",
    ai_badge_label: "AI emin değil",
    ai_badge_color: "gray",
  },
];

const LOCATION_GEO: Record<
  string,
  { lat: number; lng: number; city: string }
> = {
  "Ankara / Çankaya": { lat: 39.9179, lng: 32.8547, city: "Ankara" },
  "Ankara / Bahçelievler": { lat: 39.9489, lng: 32.826, city: "Ankara" },
  "İstanbul / Kadıköy": { lat: 40.9819, lng: 29.0244, city: "İstanbul" },
  "İstanbul / Beşiktaş": { lat: 41.0422, lng: 29.0086, city: "İstanbul" },
  "İzmir / Bornova": { lat: 38.4622, lng: 27.2208, city: "İzmir" },
  "Bursa / Nilüfer": { lat: 40.1826, lng: 28.9784, city: "Bursa" },
  "Eskişehir / Tepebaşı": { lat: 39.7767, lng: 30.5206, city: "Eskişehir" },
  "Antalya / Muratpaşa": { lat: 36.8841, lng: 30.7056, city: "Antalya" },
};

function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

const KNOWN_BADGE_PROFILES = BADGE_PROFILES.filter(
  (p) => p.ai_value_status !== "unknown"
);
const UNKNOWN_BADGE_PROFILE = BADGE_PROFILES.find(
  (p) => p.ai_value_status === "unknown"
)!;

/** Mostly fair / slightly_* ; ~1 in 12 unknown for demo. */
function pickBadgeProfile(globalIndex: number): BadgeProfile {
  if (globalIndex % 12 === 11) {
    return UNKNOWN_BADGE_PROFILE;
  }
  return pick(KNOWN_BADGE_PROFILES, globalIndex);
}

function userValueForIndex(globalIndex: number): number {
  const bases = [450, 1200, 3500, 8900, 18500, 42000, 92000, 185000];
  const jitter = 0.85 + ((globalIndex * 17) % 30) / 100;
  return Math.round(bases[globalIndex % bases.length]! * jitter);
}

function aiRangeForUserValue(
  userValue: number,
  profile: BadgeProfile
): { min: number | null; max: number | null; confidence: number; deviation: number | null } {
  if (profile.ai_value_status === "unknown") {
    return { min: null, max: null, confidence: 0.3, deviation: null };
  }
  const mid = userValue * (0.94 + ((userValue % 7) * 0.01) / 10);
  const spread =
    profile.ai_value_status === "fair"
      ? 0.06
      : profile.ai_value_status.includes("very")
        ? 0.18
        : 0.1;
  const min = Math.max(1, Math.round(mid * (1 - spread)));
  const max = Math.max(min + 1, Math.round(mid * (1 + spread)));
  const confidence =
    profile.ai_value_status === "fair"
      ? 0.82
      : profile.ai_value_status === "unknown"
        ? 0.35
        : 0.62;
  const aiMid = (min + max) / 2;
  const deviation = aiMid > 0 ? (userValue - aiMid) / aiMid : null;
  return { min, max, confidence, deviation };
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn(`[seed] listUsers page ${page}:`, error.message);
      return null;
    }
    const users = data.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit?.id) return hit.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function getOrCreateDemoUser(
  admin: SupabaseClient,
  email: string
): Promise<string> {
  const existing = await findUserIdByEmail(admin, email);
  if (existing) {
    console.log(`[seed] found user ${email} → ${existing}`);
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("duplicate")
    ) {
      const again = await findUserIdByEmail(admin, email);
      if (again) {
        console.log(`[seed] found user after duplicate ${email} → ${again}`);
        return again;
      }
    }
    throw new Error(`createUser ${email}: ${error.message}`);
  }

  const id = data.user?.id;
  if (!id) throw new Error(`createUser ${email}: no user id returned`);
  console.log(`[seed] created user ${email} → ${id}`);
  return id;
}

type ProductInsert = {
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  location: string;
  status: string;
  user_value: number;
  estimated_price: number;
  ai_min_value: number | null;
  ai_max_value: number | null;
  ai_confidence: number | null;
  ai_value_deviation: number | null;
  ai_value_status: string;
  ai_badge_label: string;
  ai_badge_color: string;
  ai_uncertainty_reason: string | null;
  is_value_hidden: boolean;
  quantity: number;
  unit: string;
  lat: number;
  lng: number;
  city: string;
  tags: string[];
  wanted_categories: string[];
  wanted_keywords: string[];
};

function buildProductsForOwner(
  ownerId: string,
  ownerIndex: number,
  countPerUser: number,
  globalOffset: number
): ProductInsert[] {
  const rows: ProductInsert[] = [];
  for (let j = 0; j < countPerUser; j++) {
    const globalIndex = globalOffset + j;
    const category = pick(CATEGORIES, globalIndex + ownerIndex);
    const location = pick(LOCATIONS, globalIndex + 2 * ownerIndex);
    const condition = pick(CONDITIONS, globalIndex + ownerIndex);
    const baseTitle = pick(BASE_TITLES, globalIndex);
    const title =
      j === 0 && ownerIndex === 0
        ? baseTitle
        : `${baseTitle} (${ownerIndex + 1}-${j + 1})`;
    const badge = pickBadgeProfile(globalIndex);
    const userValue = userValueForIndex(globalIndex);
    const { min, max, confidence, deviation } = aiRangeForUserValue(
      userValue,
      badge
    );
    const geo = LOCATION_GEO[location] ?? {
      lat: 39.92,
      lng: 32.85,
      city: "Ankara",
    };
    const slug = category.toLowerCase().replace(/\s+/g, "-");

    const wanted = wantedForTitle(baseTitle, globalIndex);

    rows.push({
      owner_id: ownerId,
      title,
      description: `Demo ilan — ${category}. Takas için uygun durum: ${condition}. Konum: ${location}. [demo-seed]`,
      category,
      condition,
      image_url: `https://picsum.photos/seed/barter-${globalIndex}/480/480`,
      location,
      status: "available",
      user_value: userValue,
      estimated_price: userValue,
      ai_min_value: min,
      ai_max_value: max,
      ai_confidence: confidence,
      ai_value_deviation: deviation,
      ai_value_status: badge.ai_value_status,
      ai_badge_label: badge.ai_badge_label,
      ai_badge_color: badge.ai_badge_color,
      ai_uncertainty_reason:
        badge.ai_value_status === "unknown"
          ? "Demo: AI bu ürün için örnek belirsizlik gösterimi."
          : null,
      is_value_hidden: true,
      quantity: 1,
      unit: "piece",
      lat: geo.lat + (ownerIndex * 0.002 + j * 0.0005) % 0.02,
      lng: geo.lng + (ownerIndex * 0.002 + j * 0.0005) % 0.02,
      city: geo.city,
      tags: ["demo-seed", slug],
      wanted_categories: wanted.categories,
      wanted_keywords: wanted.keywords,
    });
  }
  return rows;
}

function wantedForTitle(
  title: string,
  index: number
): { categories: string[]; keywords: string[] } {
  const t = title.toLowerCase();
  if (t.includes("kulaklık") || t.includes("hoparlör")) {
    return {
      categories: ["Ev & Yaşam", "Kitap & Hobi", "Oyun & Konsol"],
      keywords: ["kahve makinesi", "Kindle"],
    };
  }
  if (t.includes("kitap") || t.includes("kindle")) {
    return {
      categories: ["Elektronik", "Müzik"],
      keywords: ["kulaklık", "plak"],
    };
  }
  if (t.includes("kamp") || t.includes("sandalye")) {
    return {
      categories: ["Spor", "Kamp & Outdoor"],
      keywords: ["termos", "mat"],
    };
  }
  if (index % 5 === 0) {
    return { categories: ["Elektronik"], keywords: ["mekanik klavye"] };
  }
  return { categories: [], keywords: [] };
}

async function clearSeedProducts(
  db: SupabaseClient,
  ownerId: string
): Promise<void> {
  const { error } = await db
    .from("products")
    .delete()
    .eq("owner_id", ownerId)
    .contains("tags", ["demo-seed"]);
  if (error) {
    console.warn(`[seed] clear seed products for ${ownerId}:`, error.message);
  }
}

async function clearDemoAuxiliaryData(
  db: SupabaseClient,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  const { error: nErr } = await db
    .from("notifications")
    .delete()
    .in("user_id", userIds);
  if (nErr) console.warn("[seed] clear notifications:", nErr.message);

  const { error: fErr } = await db
    .from("product_favorites")
    .delete()
    .in("user_id", userIds);
  if (fErr) console.warn("[seed] clear favorites:", fErr.message);

  const { data: threadRows } = await db
    .from("chat_threads")
    .select("id, participant_a, participant_b")
    .in("participant_a", userIds);

  const demoThreadIds = (threadRows ?? [])
    .filter(
      (t) =>
        userIds.includes(String(t.participant_a)) &&
        userIds.includes(String(t.participant_b))
    )
    .map((t) => String(t.id));

  if (demoThreadIds.length > 0) {
    const { error: mErr } = await db
      .from("chat_messages")
      .delete()
      .in("thread_id", demoThreadIds);
    if (mErr) console.warn("[seed] clear chat_messages:", mErr.message);

    const { error: tErr } = await db
      .from("chat_threads")
      .delete()
      .in("id", demoThreadIds);
    if (tErr) console.warn("[seed] clear chat_threads:", tErr.message);
  }

  const { error: oErr } = await db
    .from("swap_offers")
    .delete()
    .in("from_user_id", userIds)
    .in("to_user_id", userIds);
  if (oErr) console.warn("[seed] clear swap_offers:", oErr.message);
}

async function seedDemoRelationships(
  admin: SupabaseClient,
  userIds: string[],
  byOwner: Map<string, string[]>
): Promise<void> {
  const P = (i: number, j: number) => byOwner.get(userIds[i]!)![j]!;

  const offerRow = async (row: {
    from_user_id: string;
    to_user_id: string;
    requested_product_id: string;
    status: string;
    message: string;
    match_label: string;
    value_match_score: number;
    safety_risk_level: string;
    safety_label: string;
    offered_product_ids: string[];
  }) => {
    const { data: ins, error } = await admin
      .from("swap_offers")
      .insert({
        from_user_id: row.from_user_id,
        to_user_id: row.to_user_id,
        requested_product_id: row.requested_product_id,
        status: row.status,
        message: row.message,
        match_label: row.match_label,
        value_match_score: row.value_match_score,
        safety_risk_level: row.safety_risk_level,
        safety_label: row.safety_label,
      })
      .select("id")
      .single();
    if (error || !ins?.id) {
      throw new Error(`swap_offers insert: ${error?.message ?? "no id"}`);
    }
    const offerId = String(ins.id);
    const items = row.offered_product_ids.map((product_id) => ({
      offer_id: offerId,
      product_id,
    }));
    const { error: iErr } = await admin.from("swap_offer_items").insert(items);
    if (iErr) throw new Error(`swap_offer_items: ${iErr.message}`);
    return offerId;
  };

  // Pending: Mehmet → Ayşe (Ayşe receives)
  await offerRow({
    from_user_id: userIds[1]!,
    to_user_id: userIds[0]!,
    requested_product_id: P(0, 1),
    status: "pending",
    message: "[demo-seed] Merhaba, bu ürününle takas yapmak istiyorum.",
    match_label: "Dengeli takas",
    value_match_score: 78,
    safety_risk_level: "low",
    safety_label: "Düşük risk",
    offered_product_ids: [P(1, 0)],
  });

  // Pending: Zeynep → Emre
  await offerRow({
    from_user_id: userIds[2]!,
    to_user_id: userIds[3]!,
    requested_product_id: P(3, 0),
    status: "pending",
    message: "[demo-seed] Takas teklifim — demo.",
    match_label: "Çok denk takas",
    value_match_score: 92,
    safety_risk_level: "low",
    safety_label: "Düşük risk",
    offered_product_ids: [P(2, 0), P(2, 1)],
  });

  // Accepted: Emre → Deniz
  await offerRow({
    from_user_id: userIds[3]!,
    to_user_id: userIds[4]!,
    requested_product_id: P(4, 0),
    status: "accepted",
    message: "[demo-seed] Kabul edilebilir bir paket öneriyorum.",
    match_label: "Dengeli takas",
    value_match_score: 71,
    safety_risk_level: "medium",
    safety_label: "Orta risk",
    offered_product_ids: [P(3, 2)],
  });

  // Completed: Deniz → Elif (+ swapped products)
  const completedId = await offerRow({
    from_user_id: userIds[4]!,
    to_user_id: userIds[5]!,
    requested_product_id: P(5, 0),
    status: "completed",
    message: "[demo-seed] Takas tamamlandı (demo).",
    match_label: "Çok denk takas",
    value_match_score: 88,
    safety_risk_level: "low",
    safety_label: "Düşük risk",
    offered_product_ids: [P(4, 1), P(4, 2)],
  });

  const swapIds = [P(5, 0), P(4, 1), P(4, 2)];
  const { error: stErr } = await admin
    .from("products")
    .update({ status: "swapped" })
    .in("id", swapIds);
  if (stErr) console.warn("[seed] mark swapped products:", stErr.message);

  const { error: rErr } = await admin.from("swap_ratings").insert([
    {
      offer_id: completedId,
      rater_id: userIds[4]!,
      rated_user_id: userIds[5]!,
      score: 5,
      comment: "[demo-seed] Sorunsuz takas, teşekkürler.",
    },
    {
      offer_id: completedId,
      rater_id: userIds[5]!,
      rated_user_id: userIds[4]!,
      score: 4,
      comment: "[demo-seed] Hızlı iletişim.",
    },
  ]);
  if (rErr) console.warn("[seed] swap_ratings:", rErr.message);

  // Rejected: Elif → Ayşe
  await offerRow({
    from_user_id: userIds[5]!,
    to_user_id: userIds[0]!,
    requested_product_id: P(0, 3),
    status: "rejected",
    message: "[demo-seed] Uymadı — reddedildi.",
    match_label: "Biraz dengesiz",
    value_match_score: 45,
    safety_risk_level: "low",
    safety_label: "Düşük risk",
    offered_product_ids: [P(5, 3)],
  });

  // Favoriler: Ayşe — başkalarının ürünleri
  const { error: favErr } = await admin.from("product_favorites").insert([
    { user_id: userIds[0]!, product_id: P(1, 4) },
    { user_id: userIds[0]!, product_id: P(2, 5) },
  ]);
  if (favErr) console.warn("[seed] favorites:", favErr.message);

  // Sohbet: Ayşe ↔ Mehmet
  const { data: thr, error: thErr } = await admin
    .from("chat_threads")
    .insert({
      product_id: P(1, 0),
      created_by: userIds[0]!,
      participant_a: userIds[0]!,
      participant_b: userIds[1]!,
    })
    .select("id")
    .single();
  if (thErr || !thr?.id) {
    console.warn("[seed] chat_threads:", thErr?.message);
  } else {
    const threadId = String(thr.id);
    const { error: msgErr } = await admin.from("chat_messages").insert([
      {
        thread_id: threadId,
        sender_id: userIds[0]!,
        body: "Merhaba, takas için Cumartesi uygun mu?",
      },
      {
        thread_id: threadId,
        sender_id: userIds[1]!,
        body: "Evet, Kadıköy tarafında olur. Görüşürüz!",
      },
    ]);
    if (msgErr) console.warn("[seed] chat_messages:", msgErr.message);
  }

  // Bildirimler (Ayşe)
  const { error: notErr } = await admin.from("notifications").insert([
    {
      user_id: userIds[0]!,
      type: "offer_received",
      title: "Yeni takas teklifi",
      body: "Mehmet sana bir takas teklifi gönderdi.",
      href: "/offers",
    },
    {
      user_id: userIds[0]!,
      type: "chat_message",
      title: "Yeni mesaj",
      body: "Mehmet: Evet, Kadıköy tarafında olur.",
      href: "/chat",
    },
  ]);
  if (notErr) console.warn("[seed] notifications:", notErr.message);
}

async function main(): Promise<void> {
  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const userIds: string[] = [];
  for (const a of DEMO_ACCOUNTS) {
    const id = await getOrCreateDemoUser(admin, a.email);
    userIds.push(id);
  }

  await clearDemoAuxiliaryData(admin, userIds);

  for (let i = 0; i < userIds.length; i++) {
    await clearSeedProducts(admin, userIds[i]!);
    const { error: pErr } = await admin.from("profiles").upsert(
      {
        id: userIds[i]!,
        full_name: DEMO_ACCOUNTS[i]!.full_name,
        location: pick(LOCATIONS, i * 3),
      },
      { onConflict: "id" }
    );
    if (pErr) console.warn("[seed] profiles upsert:", pErr.message);
  }

  const countPerUser = 8;
  let globalOffset = 0;
  let inserted = 0;
  const byOwner = new Map<string, string[]>();

  for (let i = 0; i < userIds.length; i++) {
    const ownerId = userIds[i]!;
    const batch = buildProductsForOwner(ownerId, i, countPerUser, globalOffset);
    globalOffset += countPerUser;

    const { data: rows, error } = await admin
      .from("products")
      .insert(batch)
      .select("id, owner_id");
    if (error) {
      throw new Error(`insert products for owner ${ownerId}: ${error.message}`);
    }
    const ids = (rows ?? []).map((r) => String(r.id));
    byOwner.set(ownerId, ids);
    inserted += ids.length;
    console.log(
      `[seed] inserted ${ids.length} demo products for ${DEMO_ACCOUNTS[i]!.email}`
    );
  }

  try {
    await seedDemoRelationships(admin, userIds, byOwner);
    console.log("[seed] demo offers, chat, favorites, notifications seeded");
  } catch (e) {
    console.warn(
      "[seed] relationship seed skipped or partial:",
      e instanceof Error ? e.message : e
    );
  }

  console.log(
    `[seed] done — ${DEMO_ACCOUNTS.length} users, ${inserted} products (≥40). Password: ${DEMO_PASSWORD}`
  );
}

main().catch((e) => {
  console.error("[seed] failed:", e);
  process.exit(1);
});
