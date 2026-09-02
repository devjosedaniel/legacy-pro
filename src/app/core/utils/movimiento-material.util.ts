import { Movement } from '../models/movement.model';

export type MovimientoMaterial = 'plancha' | 'retazo';

export const MOVIMIENTO_MATERIAL_LABELS: Record<MovimientoMaterial, string> = {
  plancha: 'Plancha',
  retazo: 'Retazo',
};

export function resolveMovimientoMaterial(
  mov: Pick<Movement, 'numeroLote' | 'notas' | 'materialKardex'>,
): MovimientoMaterial {
  if (mov.materialKardex === 'retazo' || mov.materialKardex === 'plancha') {
    return mov.materialKardex;
  }

  const lote = mov.numeroLote?.trim().toUpperCase() ?? '';
  if (lote.startsWith('RETAZO-')) {
    return 'retazo';
  }

  const notas = mov.notas?.trim().toLowerCase() ?? '';
  if (notas.includes('consumo retazo')) {
    return 'retazo';
  }

  return 'plancha';
}

export function formatMovimientoMaterialLabel(mov: Pick<Movement, 'numeroLote' | 'notas' | 'materialKardex'>): string {
  return MOVIMIENTO_MATERIAL_LABELS[resolveMovimientoMaterial(mov)];
}
