import { ProductCategorySlug } from './category.model';

export interface Medidas {
  ancho: number;
  alto: number;
}

export interface PlanchaAttributes {
  marcaId: string;
  marca: string;
  calibreId: string;
  calibre: string;
  medidas: Medidas;
}

export interface Product {
  id: string;
  nombre: string;
  categoryId: string;
  categorySlug: ProductCategorySlug;
  sku: string;
  stockMinimo: number;
  unidad: string;
  activo: boolean;
  notas?: string;
  plancha?: PlanchaAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoFormData {
  categorySlug: ProductCategorySlug;
  nombre: string;
  stockMinimo: number;
  notas?: string;
  marcaId?: string;
  marca?: string;
  calibreId?: string;
  ancho?: number;
  alto?: number;
}

/** @deprecated Use ProductoFormData */
export type PlanchaFormData = ProductoFormData & {
  marcaId: string;
  calibreId: string;
  ancho: number;
  alto: number;
};

export const OTRA_MARCA = 'OTRA' as const;
