/** Public profile row — no private product values */
export type PublicProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  trust_score: number;
  completed_swaps: number;
  rating_average: number;
  rating_count: number;
  created_at: string;
  wanted_categories: string[];
  wanted_keywords: string[];
};

export type PublicRatingView = {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

export type PublicProfileView = PublicProfile & {
  display_name: string;
  initials: string;
};
