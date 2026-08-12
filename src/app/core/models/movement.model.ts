import { ProductCategorySlug } from './category.model';

export type MovementEstadoFiltro = 'activos' | 'anulados';

export type MovementDirection = 'subida' | 'bajada';

export type MovementType =
  | 'entrada_compra'
  | 'salida_uso'
  | 'entrada_consignacion'
  | 'devolucion_consignacion'
  | 'compra_consignacion'
  | 'ajuste_entrada'
  | 'ajuste_salida';

export type StockTipo = 'propio' | 'consignacion';

export interface Movement {
  id: string;
  numero: string;
  grupoId?: string;
  ingresoNumero?: string;
  activo: boolean;
  puedeAnular: boolean;
  anuladoAt?: string;
  anuladoPor?: string;
  direccion: MovementDirection;
  tipo: MovementType;
  productId: string;
  categorySlug: ProductCategorySlug;
  cantidad: number;
  stockTipo: StockTipo;
  proveedorId?: string;
  proveedor?: string;
  numeroLote: string;
  fechaIngreso: string;
  fechaExpiracion?: string;
  documentoRef?: string;
  motivo?: string;
  clienteTrabajo?: string;
  notas?: string;
  usuario: string;
  fechaRegistro: string;
}

export interface LoteStock {
  productId: string;
  numeroLote: string;
  fechaIngreso: string;
  fechaExpiracion?: string;
  stockTipo: StockTipo;
  proveedorId?: string;
  proveedor?: string;
  cantidad: number;
  loteId?: number;
}

export interface ConsignacionStock {
  proveedor: string;
  cantidad: number;
}

export interface ProductStock {
  productId: string;
  propio: number;
  consignacion: ConsignacionStock[];
  total: number;
  lotes: LoteStock[];
}

export interface MovementLineFormData {
  productId: string;
  cantidad: number;
  numeroLote: string;
  fechaExpiracion?: string;
}

export interface BatchMovementFormData {
  tipo: MovementType;
  proveedorId: string;
  fechaIngreso?: string;
  fechaExpiracion?: string;
  documentoRef?: string;
  motivo?: string;
  notas?: string;
  lineas: MovementLineFormData[];
}

export interface MovementFormData {
  direccion: MovementDirection;
  tipo: MovementType;
  productId: string;
  cantidad: number;
  numeroLote: string;
  loteId?: number;
  fechaIngreso?: string;
  fechaExpiracion?: string;
  proveedorId?: string;
  proveedor?: string;
  documentoRef?: string;
  motivo?: string;
  clienteTrabajo?: string;
  notas?: string;
  retazoAncho?: number;
  retazoAlto?: number;
  retazoNotas?: string;
}

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada_compra: 'Entrada por compra',
  salida_uso: 'Salida por uso',
  entrada_consignacion: 'Entrada en consignación',
  devolucion_consignacion: 'Devolución de consignación',
  compra_consignacion: 'Compra de consignación',
  ajuste_entrada: 'Ajuste positivo',
  ajuste_salida: 'Ajuste negativo',
};

export const MOVEMENT_DIRECTION: Record<MovementType, MovementDirection> = {
  entrada_compra: 'subida',
  entrada_consignacion: 'subida',
  ajuste_entrada: 'subida',
  salida_uso: 'bajada',
  devolucion_consignacion: 'bajada',
  compra_consignacion: 'bajada',
  ajuste_salida: 'bajada',
};

export const TIPOS_SUBIDA: MovementType[] = [
  'entrada_compra',
  'entrada_consignacion',
  'ajuste_entrada',
];

export const TIPOS_BAJADA: MovementType[] = [
  'salida_uso',
  'devolucion_consignacion',
  'compra_consignacion',
  'ajuste_salida',
];

export const STOCK_TIPO_BY_TYPE: Record<MovementType, StockTipo> = {
  entrada_compra: 'propio',
  ajuste_entrada: 'propio',
  entrada_consignacion: 'consignacion',
  salida_uso: 'propio',
  ajuste_salida: 'propio',
  devolucion_consignacion: 'consignacion',
  compra_consignacion: 'consignacion',
};

export function requiresProveedor(tipo: MovementType): boolean {
  return tipo === 'entrada_consignacion' || tipo === 'devolucion_consignacion' || tipo === 'compra_consignacion';
}

export function requiresFechaIngreso(direccion: MovementDirection): boolean {
  return direccion === 'subida';
}

export function loteKey(lote: Pick<LoteStock, 'numeroLote' | 'stockTipo' | 'proveedor'>): string {
  return `${lote.numeroLote}|${lote.stockTipo}|${lote.proveedor ?? ''}`;
}

/** Anulación real: inactivo en BD y con fecha de anulación registrada. */
export function isMovimientoAnulado(
  movement: Pick<Movement, 'activo' | 'anuladoAt'>,
): boolean {
  return !movement.activo && !!movement.anuladoAt;
}
