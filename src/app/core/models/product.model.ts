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

export interface StickybackAttributes {
  marcaId: string;
  marca: string;
  medidas: {
    ancho: number;
    largo: number;
  };
}

export type FlexobackAttributes = StickybackAttributes;

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
  stickyback?: StickybackAttributes;
  flexoback?: FlexobackAttributes;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIAS_CON_LOTE: ProductCategorySlug[] = ['planchas', 'stickyback', 'flexoback'];
export const CATEGORIAS_ROLLO: ProductCategorySlug[] = ['stickyback', 'flexoback'];

export function categoriaEsRollo(slug: ProductCategorySlug): boolean {
  return CATEGORIAS_ROLLO.includes(slug);
}

export function productoRollo(product: Product): StickybackAttributes | FlexobackAttributes | undefined {
  return product.flexoback ?? product.stickyback;
}

export function productoMarcaId(product: Product): string | undefined {
  return product.plancha?.marcaId ?? productoRollo(product)?.marcaId;
}

export function categoriaUsaLote(slug: ProductCategorySlug): boolean {
  return CATEGORIAS_CON_LOTE.includes(slug);
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
