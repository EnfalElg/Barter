import type { NotificationType } from "@/lib/types/notification";

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, string> = {
  offer_received: "🔁",
  offer_accepted: "✅",
  offer_rejected: "❌",
  offer_cancelled: "↩️",
  offer_completed: "🎉",
  rating_received: "⭐",
  chat_message: "💬",
  favorite_unavailable: "🔖",
  recommendation: "✨",
};
