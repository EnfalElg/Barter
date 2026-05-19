export type ChatThreadRow = {
  id: string;
  product_id: string | null;
  created_by: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type ChatThreadListItem = {
  id: string;
  updated_at: string;
  product_id: string | null;
  product_title: string | null;
  product_image_url: string | null;
  other_user_id: string;
  other_display_name: string;
  other_avatar_url: string | null;
  other_initials: string;
  last_message_preview: string | null;
};

export type ChatThreadDetail = {
  thread: ChatThreadRow;
  messages: ChatMessageRow[];
  other_user_id: string;
  other_profile: {
    display_name: string;
    avatar_url: string | null;
    initials: string;
    trust_score: number;
    completed_swaps: number;
    rating_average: number;
    rating_count: number;
  };
  product: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;
  current_user_id: string;
};
