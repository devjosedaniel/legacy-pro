export const SRI_ESTADOS_FILTRO: Array<{ value: string; label: string }> = [
  { value: 'AUTORIZADO', label: 'Autorizado' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RECIBIDA', label: 'Recibida' },
  { value: 'DEVUELTA', label: 'Devuelta' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'SIN_ESTADO', label: 'Sin estado' },
];

export function sriEstadoLabel(estado?: string | null): string {
  if (!estado?.trim()) return '';
  const value = estado.trim();
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function sriBadgeClass(estado?: string | null): string {
  switch ((estado ?? '').toUpperCase()) {
    case 'AUTORIZADO':
      return 'badge--sri-ok';
    case 'DEVUELTA':
      return 'badge--sri-warn';
    case 'RECHAZADO':
      return 'badge--sri-error';
    case 'PENDIENTE':
    case 'RECIBIDA':
      return 'badge--sri-info';
    default:
      return 'badge--sri-muted';
  }
}
