import { MovementDirection, MovementType, StockTipo } from './movement.model';

export type RetazoEstado = 'disponible' | 'consumido' | 'inactivo';
export type RetazoOrigen = 'bajada' | 'reporte_externo' | 'carga_inicial';

export interface RetazoMovimientoOrigen {  numero: string;
  tipo?: MovementType;
  direccion?: MovementDirection;
  cantidad?: number;
  stockTipo?: StockTipo;
  proveedor?: string;
  numeroLote?: string;
  fechaRegistro?: string;
}

export interface Retazo {
  id: string;
  productId: string;
  productoNombre?: string;
  categorySlug?: string;
  movimientoOrigenId?: string;
  movimientoOrigen?: RetazoMovimientoOrigen;
  loteOrigenId?: string;
  codigo: string;
  ancho: number;
  alto: number;
  origen: RetazoOrigen;
  estado: RetazoEstado;
  notas?: string;
  createdAt: string;
  loteNumero?: string;
  movimientoOrigenNumero?: string;
  creadoPorNombre?: string;
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

export type RetazoHistorialEvento = 'creacion' | 'consumo';

export interface RetazoHistorialItem {
  id: string;
  retazoId: string;
  codigo: string;
  productId: string;
  productoNombre?: string;
  ancho: number;
  alto: number;
  origen: RetazoOrigen;
  evento: RetazoHistorialEvento;
  direccion: MovementDirection;
  fecha: string;
  movimientoOrigenId?: string;
  movimientoOrigenNumero?: string;
  loteNumero?: string;
  usuario?: string;
}

export const RETAZO_HISTORIAL_EVENTO_LABELS: Record<RetazoHistorialEvento, string> = {
  creacion: 'Creación',
  consumo: 'Consumo',
};
