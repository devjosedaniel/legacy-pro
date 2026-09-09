import { ArmadoImportData, ArmadoPlanchaSize, GrupoProduccion } from '../models/grupo-produccion.model';
import { ArmadoReportContext } from './armado-report.util';
import { piezaAltoCm, piezaAnchoCm, piezaXCm, piezaYCm } from './armado-units.util';

export function rebuildArmadoFromGrupo(grupo: GrupoProduccion): ArmadoImportData | null {
  const piezas = grupo.armadoPiezas ?? [];
  if (piezas.length === 0) {
    return null;
  }

  const meta = grupo.armadoMetadata ?? {};
  const planchaFromMeta = meta['plancha'] as ArmadoPlanchaSize | undefined;
  const layoutFromMeta = meta['layout'] as ArmadoPlanchaSize | undefined | null;

  const plancha =
    planchaFromMeta ??
    (grupo.materialAnchoCm && grupo.materialAltoCm
      ? {
          ancho_mm: grupo.materialAnchoCm * 10,
          alto_mm: grupo.materialAltoCm * 10,
          ancho_cm: grupo.materialAnchoCm,
          alto_cm: grupo.materialAltoCm,
        }
      : inferPlanchaFromPiezas(piezas));

  return {
    archivo_nombre: grupo.armadoArchivoNombre ?? null,
    cantidad_piezas: (meta['cantidad_piezas'] as number | undefined) ?? piezas.length,
    plancha,
    layout: layoutFromMeta ?? null,
    piezas,
    metadata: meta,
  };
}

export function buildArmadoReportContextFromGrupo(grupo: GrupoProduccion): ArmadoReportContext {
  const campos: ArmadoReportContext['campos'] = [{ etiqueta: 'Grupo', valor: `#${grupo.id}` }];

  if (grupo.calibreNombre) {
    campos.push({ etiqueta: 'Calibre', valor: grupo.calibreNombre });
  }

  if (grupo.ordenes.length > 0) {
    campos.push({
      etiqueta: grupo.ordenes.length === 1 ? 'Orden' : 'Órdenes',
      valor: grupo.ordenes.map((orden) => orden.secuencia).join(', '),
    });
  }

  const material = grupo.material;
  if (material?.tipo === 'plancha') {
    if (material.productoNombre) {
      campos.push({ etiqueta: 'Plancha', valor: material.productoNombre });
    }
    if (material.loteNumero) {
      campos.push({ etiqueta: 'Lote', valor: material.loteNumero });
    }
  } else if (material?.tipo === 'retazo' && material.retazoCodigo) {
    campos.push({ etiqueta: 'Retazo', valor: material.retazoCodigo });
  }

  if (grupo.terminadoAt) {
    campos.push({
      etiqueta: 'Proceso iniciado',
      valor: new Date(grupo.terminadoAt).toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  }

  if (grupo.terminadoPor) {
    campos.push({ etiqueta: 'Iniciado por', valor: grupo.terminadoPor });
  }

  const retazos = (grupo.retazosSobrantes ?? [])
    .filter((r) => r.ancho > 0 && r.alto > 0)
    .map((r) => ({
      codigo: r.codigo?.trim() || '—',
      anchoCm: r.ancho,
      altoCm: r.alto,
    }));

  return {
    titulo: `Reporte de armado — Grupo #${grupo.id}`,
    armadoPor: grupo.registradoPor,
    campos,
    retazos,
    consumoCm2: grupo.consumoCm2,
    areaUsadaCm2: grupo.areaUsadaCm2,
    desperdicioCm2: grupo.desperdicioCm2,
  };
}

function inferPlanchaFromPiezas(piezas: ArmadoImportData['piezas']): ArmadoPlanchaSize {
  const maxX = Math.max(...piezas.map((p) => piezaXCm(p) + piezaAnchoCm(p)), 0);
  const maxY = Math.max(...piezas.map((p) => piezaYCm(p) + piezaAltoCm(p)), 0);

  return {
    ancho_mm: maxX * 10,
    alto_mm: maxY * 10,
    ancho_cm: Math.round(maxX * 100) / 100,
    alto_cm: Math.round(maxY * 100) / 100,
  };
}
