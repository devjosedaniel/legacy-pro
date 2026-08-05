/** Formatea ancho × alto asumiendo valores en centímetros. */
export function formatMedidasCm(ancho: number, alto: number): string {
  return `${formatDimensionCm(ancho)} × ${formatDimensionCm(alto)}`;
}

export function formatDimensionCm(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${text} cm`;
}
