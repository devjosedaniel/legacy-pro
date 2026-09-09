import { ArmadoPiezaPreview, ArmadoPlanchaSize } from '../models/grupo-produccion.model';

type PiezaLike = Partial<ArmadoPiezaPreview>;

export function cmToMm(cm: number): number {
  return cm * 10;
}

export function mmToCm(mm: number): number {
  return mm / 10;
}

export function piezaXCm(pieza: PiezaLike): number {
  if (pieza.x_cm != null) return Number(pieza.x_cm);
  if (pieza.x_mm != null) return mmToCm(Number(pieza.x_mm));
  return 0;
}

export function piezaYCm(pieza: PiezaLike): number {
  if (pieza.y_cm != null) return Number(pieza.y_cm);
  if (pieza.y_mm != null) return mmToCm(Number(pieza.y_mm));
  return 0;
}

export function piezaAnchoCm(pieza: PiezaLike): number {
  if (pieza.ancho_cm != null) return Number(pieza.ancho_cm);
  if (pieza.ancho_mm != null) return mmToCm(Number(pieza.ancho_mm));
  return 0;
}

export function piezaAltoCm(pieza: PiezaLike): number {
  if (pieza.alto_cm != null) return Number(pieza.alto_cm);
  if (pieza.alto_mm != null) return mmToCm(Number(pieza.alto_mm));
  return 0;
}

export function piezaAreaCm2(pieza: PiezaLike): number {
  return piezaAnchoCm(pieza) * piezaAltoCm(pieza);
}

export function planchaAnchoCm(plancha: ArmadoPlanchaSize): number {
  if (plancha.ancho_cm > 0) return plancha.ancho_cm;
  return mmToCm(plancha.ancho_mm);
}

export function planchaAltoCm(plancha: ArmadoPlanchaSize): number {
  if (plancha.alto_cm > 0) return plancha.alto_cm;
  return mmToCm(plancha.alto_mm);
}

export function formatPiezaCm(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPiezaSizeCm(pieza: PiezaLike): string {
  return `${formatPiezaCm(piezaAnchoCm(pieza))} × ${formatPiezaCm(piezaAltoCm(pieza))} cm`;
}

export function isPiezaColocada(pieza: PiezaLike): boolean {
  if (pieza.colocada === false) return false;
  if (pieza.colocada === true) return true;

  const x = piezaXCm(pieza);
  const y = piezaYCm(pieza);
  return x >= 0 && y >= 0 && Math.abs(x) < 100_000_000 && Math.abs(y) < 100_000_000;
}
