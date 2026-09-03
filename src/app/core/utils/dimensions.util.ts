/** Formatea ancho × alto asumiendo valores en centímetros. */
export function formatMedidasCm(ancho: number, alto: number): string {
  return `${formatDimensionCm(ancho)} × ${formatDimensionCm(alto)}`;
}

/** Stickyback: ancho en cm, largo en metros (almacenado en campo alto). */
export function formatStickybackMedidas(ancho: number, largo: number): string {
  return `${formatDimensionCm(ancho)} × ${formatLargoMetros(largo)}`;
}

export function formatLargoMetros(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${text} m`;
}

export function formatDimensionCm(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${text} cm`;
}
