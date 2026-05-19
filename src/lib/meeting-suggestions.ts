import type { LocationDistanceLabel } from "@/lib/location-utils";

export type MeetingSuggestion = {
  title: string;
  description: string;
  icon: string;
};

export type MeetingSuggestionsInput = {
  locationHintLevel?: LocationDistanceLabel;
  sameCity?: boolean;
  trustRiskLevel?: "low" | "medium" | "high" | "unknown";
};

const BASE: MeetingSuggestion[] = [
  {
    icon: "👥",
    title: "Kalabalık bir yer seç",
    description:
      "AVM, kafe veya metro çıkışı gibi güvenli ve kamusal alanları tercih et.",
  },
  {
    icon: "🔍",
    title: "Ürünü teslim almadan kontrol et",
    description:
      "Takas öncesi ürünün çalıştığını ve açıklamadaki gibi olduğunu kontrol et.",
  },
  {
    icon: "💬",
    title: "Sohbette detayları netleştir",
    description:
      "Buluşma saati, konum ve ürün detaylarını önceden yazılı olarak konuş.",
  },
];

function isFaceToFaceFriendly(level?: LocationDistanceLabel): boolean {
  return (
    level === "walking" ||
    level === "nearby" ||
    level === "same_area" ||
    level === "same_city"
  );
}

export function getMeetingSuggestions(input: MeetingSuggestionsInput = {}): MeetingSuggestion[] {
  const out: MeetingSuggestion[] = [...BASE];
  const level = input.locationHintLevel;

  if (isFaceToFaceFriendly(level) || input.sameCity) {
    out.push({
      icon: "🤝",
      title: "Yüz yüze takas uygun görünüyor",
      description:
        "Yakın bölgede olduğunuz için güvenli bir buluşma noktası seçebilirsiniz.",
    });
  }

  if (level === "far") {
    out.push({
      icon: "📦",
      title: "Kargo veya aracı teslimat gerekebilir",
      description:
        "Farklı şehirlerdeyseniz gönderi ve paketleme detaylarını netleştirin.",
    });
  }

  if (input.trustRiskLevel === "high") {
    out.push({
      icon: "📄",
      title: "Ek kanıt iste",
      description:
        "Fatura, seri numarası, ek fotoğraf veya kısa video istemek güvenliği artırır.",
    });
  }

  return out;
}

export function trustRiskFromScore(score: number): MeetingSuggestionsInput["trustRiskLevel"] {
  if (score < 40) return "high";
  if (score < 60) return "medium";
  if (score >= 80) return "low";
  return "unknown";
}
