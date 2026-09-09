import {
  ApiGrupo,
  ApiGrupoMaterial,
  GrupoEstado,
  GrupoMaterial,
  GrupoOrdenResumen,
  GrupoProduccion,
} from '../models/grupo-produccion.model';

function formatOpSecuencia(secuencia: string): string {
  const value = secuencia.trim();
  if (!value) return value;
  if (/^op/i.test(value)) return value.replace(/^op/i, 'OP');
  return `OP ${value}`;
}

function formatSisSecuencia(secuencia?: string): string | undefined {
  if (!secuencia?.trim()) return undefined;
  const value = secuencia.trim();
  if (/^sis/i.test(value)) return value.replace(/^sis/i, 'SIS');
  return `SIS ${value}`;
}

function mapGrupoMaterial(api: ApiGrupoMaterial): GrupoMaterial {
  const material: GrupoMaterial = { tipo: api.tipo };

  if (api.tipo === 'plancha') {
    material.productoId = api.producto_id;
    material.productoNombre = api.producto_nombre;
    material.productoSku = api.producto_sku ?? undefined;
    material.loteId = api.lote_id;
    material.loteNumero = api.lote_numero;
  } else {
    material.retazoId = api.retazo_id;
    material.retazoCodigo = api.retazo_codigo;
    material.retazoAncho = api.retazo_ancho;
    material.retazoAlto = api.retazo_alto;
    material.productoId = api.producto_id;
    material.productoNombre = api.producto_nombre;
  }

  return material;
}

function mapGrupoOrden(orden: ApiGrupo['ordenes'][number]): GrupoOrdenResumen {
  return {
    id: orden.id,
    secuencia: formatOpSecuencia(orden.secuencia),
    calibreId: orden.calibre_id,
    calibreNombre: orden.calibre?.nombre ?? `Calibre ${orden.calibre_id}`,
    clienteNombre: orden.cliente?.nombres,
    trabajoSecuencia: formatSisSecuencia(orden.trabajo?.secuencia),
    detalle: orden.detalle,
    urgencia: orden.urgencia,
    completaEnPlancha: orden.completa ?? false,
  };
}

function normalizeEstado(apiEstado: string): GrupoEstado {
  if (apiEstado === 'terminado') return 'terminado';
  if (apiEstado === 'material_asignado') return 'material_asignado';
  if (apiEstado === 'borrador') return 'borrador';
  return 'registrado';
}

export function mapGrupo(api: ApiGrupo): GrupoProduccion {
  return {
    id: String(api.id),
    backendId: api.id,
    ordenes: api.ordenes.map(mapGrupoOrden),
    material: mapGrupoMaterial(api.material),
    calibreId: api.calibre_id,
    calibreNombre: api.calibre?.nombre ?? null,
    estado: normalizeEstado(api.estado),
    notas: api.notas ?? undefined,
    movimientoId: api.movimiento_id ?? undefined,
    movimientoNumero: api.movimiento?.numero,
    registradoPor: api.creado_por?.nombre ?? api.creado_por?.usuario,
    terminadoPor: api.terminado_por?.nombre ?? api.terminado_por?.usuario,
    terminadoAt: api.terminado_at ?? undefined,
    retazosSobrantes: api.retazos_sobrantes?.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      ancho: Number(r.ancho),
      alto: Number(r.alto),
      notas: r.notas ?? undefined,
    })),
    materialAnchoCm: api.material_ancho_cm ?? undefined,
    materialAltoCm: api.material_alto_cm ?? undefined,
    areaMaterialCm2: api.area_material_cm2 ?? undefined,
    areaUsadaCm2: api.area_usada_cm2 ?? undefined,
    consumoCm2: api.consumo_cm2 ?? undefined,
    desperdicioCm2: api.desperdicio_cm2 ?? undefined,
    areaSobrantesCm2: api.area_sobrantes_cm2 ?? undefined,
    armadoArchivoNombre: api.armado_archivo_nombre ?? undefined,
    armadoPiezas: api.armado_piezas ?? undefined,
    armadoMetadata: api.armado_metadata ?? undefined,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}
