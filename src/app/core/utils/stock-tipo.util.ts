import { StockTipo } from '../models/movement.model';

export const STOCK_TIPO_LABELS: Record<StockTipo, string> = {
  propio: 'Propio',
  consignacion: 'Consignación',
};

/** Etiqueta de origen de stock para un movimiento (incluye proveedor en consignación). */
export function formatMovimientoStockOrigen(stockTipo: StockTipo, proveedor?: string | null): string {
  if (stockTipo === 'consignacion') {
    return proveedor?.trim() ? `Consignación · ${proveedor.trim()}` : 'Consignación';
  }
  return STOCK_TIPO_LABELS.propio;
}
