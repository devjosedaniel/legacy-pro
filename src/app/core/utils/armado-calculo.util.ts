import { ArmadoPiezaPreview } from '../models/grupo-produccion.model';
import { isPiezaColocada, piezaAltoCm, piezaAnchoCm, piezaXCm, piezaYCm } from './armado-units.util';

export interface ArmadoUsoStats {
  consumoCm2: number;
  areaMaterialCm2: number;
  areaUsadaCm2: number;
  desperdicioCm2: number;
  areaSobrantesCm2: number;
  areaDisponibleRetazosCm2: number;
  cantidadPiezas: number;
  porcentajeUso: number;
}

export function calcularUsoArmado(
  piezas: ArmadoPiezaPreview[],
  materialAnchoCm: number,
  materialAltoCm: number,
  areaSobrantesCm2 = 0,
): ArmadoUsoStats | null {
  if (!piezas.length || materialAnchoCm <= 0 || materialAltoCm <= 0) {
    return null;
  }

  let consumoCm2 = 0;
  let cantidadPiezas = 0;
  let minX: number | null = null;
  let minY: number | null = null;
  let maxX = 0;
  let maxY = 0;
  let tieneBounds = false;

  for (const pieza of piezas) {
    if (!isPiezaColocada(pieza)) continue;

    const ancho = piezaAnchoCm(pieza);
    const alto = piezaAltoCm(pieza);
    if (ancho <= 0 || alto <= 0) continue;

    consumoCm2 += ancho * alto;
    cantidadPiezas++;

    const x = piezaXCm(pieza);
    const y = piezaYCm(pieza);
    minX = minX === null ? x : Math.min(minX, x);
    minY = minY === null ? y : Math.min(minY, y);
    maxX = Math.max(maxX, x + ancho);
    maxY = Math.max(maxY, y + alto);
    tieneBounds = true;
  }

  if (cantidadPiezas === 0) return null;

  const areaMaterialCm2 = round2(materialAnchoCm * materialAltoCm);
  consumoCm2 = round2(consumoCm2);
  const areaUsadaCm2 =
    tieneBounds && minX !== null && minY !== null ? round2((maxX - minX) * (maxY - minY)) : consumoCm2;
  const areaSobrantes = round2(Math.max(0, areaSobrantesCm2));
  const areaDisponibleRetazosCm2 = round2(Math.max(0, areaMaterialCm2 - consumoCm2));
  const desperdicioCm2 = round2(Math.max(0, areaMaterialCm2 - consumoCm2 - areaSobrantes));
  const porcentajeUso = areaMaterialCm2 > 0 ? round2((consumoCm2 / areaMaterialCm2) * 100) : 0;

  return {
    consumoCm2,
    areaMaterialCm2,
    areaUsadaCm2,
    desperdicioCm2,
    areaSobrantesCm2: areaSobrantes,
    areaDisponibleRetazosCm2,
    cantidadPiezas,
    porcentajeUso,
  };
}

export function retazosExcedenAreaDisponible(
  areaRetazosCm2: number,
  areaDisponibleRetazosCm2: number,
): boolean {
  return round2(Math.max(0, areaRetazosCm2)) > round2(Math.max(0, areaDisponibleRetazosCm2));
}

/** El retazo físico cabe en la hoja, en cualquiera de las dos orientaciones. */
export function retazoCabeEnMaterial(
  anchoCm: number,
  altoCm: number,
  materialAnchoCm: number,
  materialAltoCm: number,
  toleranciaCm = 0.05,
): boolean {
  if (anchoCm <= 0 || altoCm <= 0 || materialAnchoCm <= 0 || materialAltoCm <= 0) {
    return false;
  }
  const cabe = (w: number, h: number) =>
    w <= materialAnchoCm + toleranciaCm && h <= materialAltoCm + toleranciaCm;
  return cabe(anchoCm, altoCm) || cabe(altoCm, anchoCm);
}

export function formatCm2(value: number): string {
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cm²`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
