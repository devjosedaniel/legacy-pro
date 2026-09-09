/** 0 = normal, 1 = urgente, 2 = emergente. */
export type UrgenciaNivel = 0 | 1 | 2;

export function normalizeUrgencia(value?: number | null): UrgenciaNivel {
  if (value === 1 || value === 2) return value;
  return 0;
}

export function urgenciaLabel(value?: number | null): string | null {
  switch (normalizeUrgencia(value)) {
    case 1:
      return 'Urgente';
    case 2:
      return 'Emergente';
    default:
      return null;
  }
}
