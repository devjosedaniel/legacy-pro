export type ProductCategorySlug = 'planchas' | 'peliculas' | 'stickyback' | 'cejas' | 'otros';

export interface Category {
  id: string;
  slug: ProductCategorySlug;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}
