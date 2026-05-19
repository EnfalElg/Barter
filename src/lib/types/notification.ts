export type NotificationType =
  | "offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "offer_cancelled"
  | "offer_completed"
  | "rating_received"
  | "chat_message"
  | "favorite_unavailable"
  | "recommendation";

/** Full row (server-side). */
export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  related_offer_id: string | null;
  related_product_id: string | null;
  related_thread_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** API / client list item (no user_id). */
export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationResponse = {
  notifications: NotificationListItem[];
  unread_count: number;
};

/** @deprecated Use Notification */
export type AppNotification = Notification;

/** @deprecated Use NotificationResponse */
export type NotificationsListResponse = NotificationResponse;
