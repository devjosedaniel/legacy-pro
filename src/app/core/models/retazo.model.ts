export type RetazoEstado = 'disponible' | 'consumido' | 'inactivo';
export type RetazoOrigen = 'bajada' | 'reporte_externo' | 'carga_inicial';

export interface Retazo {
  id: string;
  productId: string;
  productoNombre?: string;
  categorySlug?: string;
  movimientoOrigenId?: string;
  loteOrigenId?: string;
  codigo: string;
  ancho: number;
  alto: number;
  origen: RetazoOrigen;
  estado: RetazoEstado;
  notas?: string;
  createdAt: string;
  loteNumero?: string;
}

export interface RetazoFormData {
  productId: string;
  ancho: number;
  alto: number;
  notas?: string;
  codigo?: string;
  movimientoOrigenId?: number;
  loteOrigenId?: number;
}

export const RETAZO_ESTADO_LABELS: Record<RetazoEstado, string> = {
  disponible: 'Disponible',
  consumido: 'Consumido',
  inactivo: 'Inactivo',
};

export const RETAZO_ORIGEN_LABELS: Record<RetazoOrigen, string> = {
  bajada: 'Bajada de plancha',
  reporte_externo: 'Reporte manual',
  carga_inicial: 'Carga inicial',
};

export interface RetazoCargaRow {
  sku: string;
  ancho: number;
  alto: number;
  codigo?: string;
  notas?: string;
}

export interface RetazoCargaResult {
  creados: Retazo[];
  errores: { linea: number; mensaje: string }[];
  totalCreados: number;
  totalErrores: number;
  mensaje: string;
}
