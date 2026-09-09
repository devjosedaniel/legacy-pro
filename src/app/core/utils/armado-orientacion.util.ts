import { ArmadoImportData, ArmadoPiezaPreview, ArmadoPlanchaSize } from '../models/grupo-produccion.model';
import { isPiezaColocada, piezaAltoCm, piezaAnchoCm, piezaXCm, piezaYCm, planchaAltoCm, planchaAnchoCm } from './armado-units.util';

const DIM_TOL_CM = 0.25;
const FIT_TOL_CM = 0.35;

export type ArmadoOrientacionAjuste = 'ninguno' | 'rotacion_90_ccw' | 'rotacion_90_cw';

export interface ArmadoOrientacionResult {
  armado: ArmadoImportData;
  ajuste: ArmadoOrientacionAjuste;
  mensaje?: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function approxEq(a: number, b: number, tolerance = DIM_TOL_CM): boolean {
  return Math.abs(a - b) <= tolerance;
}

function sizePayload(anchoCm: number, altoCm: number): ArmadoPlanchaSize {
  return {
    ancho_cm: round2(anchoCm),
    alto_cm: round2(altoCm),
    ancho_mm: round2(anchoCm * 10),
    alto_mm: round2(altoCm * 10),
  };
}

function piecesFitMaterial(
  piezas: ArmadoPiezaPreview[],
  materialAnchoCm: number,
  materialAltoCm: number,
): boolean {
  const colocadas = piezas.filter((pieza) => isPiezaColocada(pieza));
  if (colocadas.length === 0) return false;

  return colocadas.every((pieza) => {
    const x = piezaXCm(pieza);
    const y = piezaYCm(pieza);
    const ancho = piezaAnchoCm(pieza);
    const alto = piezaAltoCm(pieza);
    if (ancho <= 0 || alto <= 0) return false;

    return (
      x >= -FIT_TOL_CM &&
      y >= -FIT_TOL_CM &&
      x + ancho <= materialAnchoCm + FIT_TOL_CM &&
      y + alto <= materialAltoCm + FIT_TOL_CM
    );
  });
}

function rotatePiece90Ccw(
  pieza: ArmadoPiezaPreview,
  ctaAltoCm: number,
): ArmadoPiezaPreview {
  const x = piezaXCm(pieza);
  const y = piezaYCm(pieza);
  const ancho = piezaAnchoCm(pieza);
  const alto = piezaAltoCm(pieza);

  return {
    ...pieza,
    x_cm: round2(ctaAltoCm - y - alto),
    y_cm: round2(x),
    ancho_cm: round2(alto),
    alto_cm: round2(ancho),
    angulo: ((Number(pieza.angulo ?? 0) + 270) % 360),
    x_mm: undefined,
    y_mm: undefined,
    ancho_mm: undefined,
    alto_mm: undefined,
  };
}

function rotatePiece90Cw(
  pieza: ArmadoPiezaPreview,
  ctaAnchoCm: number,
): ArmadoPiezaPreview {
  const x = piezaXCm(pieza);
  const y = piezaYCm(pieza);
  const ancho = piezaAnchoCm(pieza);
  const alto = piezaAltoCm(pieza);

  return {
    ...pieza,
    x_cm: round2(y),
    y_cm: round2(ctaAnchoCm - x - ancho),
    ancho_cm: round2(alto),
    alto_cm: round2(ancho),
    angulo: ((Number(pieza.angulo ?? 0) + 90) % 360),
    x_mm: undefined,
    y_mm: undefined,
    ancho_mm: undefined,
    alto_mm: undefined,
  };
}

function applyRotation(
  armado: ArmadoImportData,
  mode: Exclude<ArmadoOrientacionAjuste, 'ninguno'>,
  ctaAnchoCm: number,
  ctaAltoCm: number,
  materialAnchoCm: number,
  materialAltoCm: number,
): ArmadoImportData {
  const rotatePiece =
    mode === 'rotacion_90_ccw'
      ? (pieza: ArmadoPiezaPreview) => rotatePiece90Ccw(pieza, ctaAltoCm)
      : (pieza: ArmadoPiezaPreview) => rotatePiece90Cw(pieza, ctaAnchoCm);

  return {
    ...armado,
    plancha: sizePayload(materialAnchoCm, materialAltoCm),
    piezas: armado.piezas.map(rotatePiece),
    metadata: {
      ...(armado.metadata ?? {}),
      orientacion_ajuste: mode,
      plancha_cta_original_cm: {
        ancho: round2(ctaAnchoCm),
        alto: round2(ctaAltoCm),
      },
    },
  };
}

function formatMedida(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Alinea el armado del CTA con las medidas reales del material cuando TIFF Assembler
 * exporta ancho/alto invertidos (p. ej. plancha 127×203.2 cm y CTA 203.2×127 cm).
 */
export function normalizeArmadoToMaterial(
  armado: ArmadoImportData,
  materialAnchoCm: number,
  materialAltoCm: number,
): ArmadoOrientacionResult {
  if (materialAnchoCm <= 0 || materialAltoCm <= 0) {
    return { armado, ajuste: 'ninguno' };
  }

  const ctaAnchoCm = planchaAnchoCm(armado.plancha);
  const ctaAltoCm = planchaAltoCm(armado.plancha);

  const directDims =
    approxEq(ctaAnchoCm, materialAnchoCm) && approxEq(ctaAltoCm, materialAltoCm);
  const swappedDims =
    approxEq(ctaAnchoCm, materialAltoCm) && approxEq(ctaAltoCm, materialAnchoCm);

  if (directDims && piecesFitMaterial(armado.piezas, materialAnchoCm, materialAltoCm)) {
    return { armado, ajuste: 'ninguno' };
  }

  const rotationModes: Array<Exclude<ArmadoOrientacionAjuste, 'ninguno'>> = [
    'rotacion_90_ccw',
    'rotacion_90_cw',
  ];

  for (const mode of rotationModes) {
    const rotated = applyRotation(
      armado,
      mode,
      ctaAnchoCm,
      ctaAltoCm,
      materialAnchoCm,
      materialAltoCm,
    );

    if (piecesFitMaterial(rotated.piezas, materialAnchoCm, materialAltoCm)) {
      return {
        armado: rotated,
        ajuste: mode,
        mensaje:
          swappedDims || !directDims
            ? `El CTA traía la plancha como ${formatMedida(ctaAnchoCm)}×${formatMedida(ctaAltoCm)} cm; se ajustó automáticamente a ${formatMedida(materialAnchoCm)}×${formatMedida(materialAltoCm)} cm del material seleccionado.`
            : `Las piezas del CTA no encajaban en la orientación original; se rotó el armado para alinearlo con el material (${formatMedida(materialAnchoCm)}×${formatMedida(materialAltoCm)} cm).`,
      };
    }
  }

  if (directDims) {
    return { armado, ajuste: 'ninguno' };
  }

  if (swappedDims) {
    const rotated = applyRotation(
      armado,
      'rotacion_90_ccw',
      ctaAnchoCm,
      ctaAltoCm,
      materialAnchoCm,
      materialAltoCm,
    );

    return {
      armado: rotated,
      ajuste: 'rotacion_90_ccw',
      mensaje: `El CTA traía la plancha como ${formatMedida(ctaAnchoCm)}×${formatMedida(ctaAltoCm)} cm; se aplicó rotación para coincidir con ${formatMedida(materialAnchoCm)}×${formatMedida(materialAltoCm)} cm.`,
    };
  }

  return { armado, ajuste: 'ninguno' };
}
