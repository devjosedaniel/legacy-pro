import { ProductCategorySlug } from './category.model';

export interface Marca {
  id: string;
  nombre: string;
  categoriaId: string;
  categoriaSlug?: ProductCategorySlug;
  activo: boolean;
}
