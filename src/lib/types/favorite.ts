import type { PublicProduct } from "@/lib/types/product";

export type ProductFavorite = {
  id: string;
  product: PublicProduct;
  created_at: string;
};

export type FavoriteProductResponse = {
  favorites: ProductFavorite[];
};

export type FavoriteMutationResponse = {
  success: boolean;
  saved: boolean;
};
