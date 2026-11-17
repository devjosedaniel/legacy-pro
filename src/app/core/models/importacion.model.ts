export interface ApiImportacionDetalle {
  id?: number;
  importacion_id?: number;
  plancha_id?: number | null;
  descripcion?: string | null;
  ancho: number | string;
  alto: number | string;
  unidades: number;
  valorfob: number;
}

export interface ApiImportacion {
  id: number;
  secuencia: string | number;
  fecha: string;
  compra: string;
  valorcompra: number;
  doc_compra: string;
  comision: number;
  porcentajeisd: number;
  valorisd: number;
  seguro: string;
  valorseguro: number;
  doc_seguro: string;
  transint1: string;
  valortransint1: number;
  doc_transint1: string;
  transint2: string;
  valortransint2: number;
  doc_transint2: string;
  arancel: number;
  info_arancel: string;
  doc_arancel: string;
  almacenaje1: string;
  valoralmacenaje1: number;
  doc_almacenaje1: string;
  almacenaje2: string;
  valoralmacenaje2: number;
  doc_almacenaje2: string;
  transnac: string;
  valortransnac: number;
  doc_transnac: string;
  agente: string;
  valoragente: number;
  doc_agente: string;
  total_compra: number;
  total_ctacobrar: number;
  gastos: number;
  porcentaje_gastos: number;
  pago1: number;
  pago2: number;
  pago3: number;
  transferencia: number;
  detalles?: ApiImportacionDetalle[];
}

export interface ImportacionDetalle {
  descripcion: string;
  ancho: number | null;
  alto: number | null;
  unidades: number | null;
  valorfob: number | null;
}

export interface Importacion {
  id: number;
  secuencia: string;
  fecha: string;
  compra: string;
  valorcompra: number | null;
  docCompra: string;
  comision: number | null;
  porcentajeisd: number | null;
  valorisd: number | null;
  seguro: string;
  valorseguro: number | null;
  docSeguro: string;
  transint1: string;
  valortransint1: number | null;
  docTransint1: string;
  transint2: string;
  valortransint2: number | null;
  docTransint2: string;
  arancel: number | null;
  infoArancel: string;
  docArancel: string;
  almacenaje1: string;
  valoralmacenaje1: number | null;
  docAlmacenaje1: string;
  almacenaje2: string;
  valoralmacenaje2: number | null;
  docAlmacenaje2: string;
  transnac: string;
  valortransnac: number | null;
  docTransnac: string;
  agente: string;
  valoragente: number | null;
  docAgente: string;
  totalCompra: number | null;
  totalCtaCobrar: number | null;
  gastos: number | null;
  porcentajeGastos: number | null;
  pago1: number | null;
  pago2: number | null;
  pago3: number | null;
  transferencia: number | null;
  detalles: ImportacionDetalle[];
}

export function padImportacionSecuencia(secuencia: string | number): string {
  return String(secuencia ?? '').padStart(5, '0');
}

export function mapImportacion(api: ApiImportacion): Importacion {
  return {
    id: api.id,
    secuencia: String(api.secuencia ?? ''),
    fecha: toDateInput(api.fecha),
    compra: api.compra ?? '',
    valorcompra: toNum(api.valorcompra),
    docCompra: api.doc_compra ?? '',
    comision: toNum(api.comision),
    porcentajeisd: toNum(api.porcentajeisd),
    valorisd: toNum(api.valorisd),
    seguro: api.seguro ?? '',
    valorseguro: toNum(api.valorseguro),
    docSeguro: api.doc_seguro ?? '',
    transint1: api.transint1 ?? '',
    valortransint1: toNum(api.valortransint1),
    docTransint1: api.doc_transint1 ?? '',
    transint2: api.transint2 ?? '',
    valortransint2: toNum(api.valortransint2),
    docTransint2: api.doc_transint2 ?? '',
    arancel: toNum(api.arancel),
    infoArancel: api.info_arancel ?? '',
    docArancel: api.doc_arancel ?? '',
    almacenaje1: api.almacenaje1 ?? '',
    valoralmacenaje1: toNum(api.valoralmacenaje1),
    docAlmacenaje1: api.doc_almacenaje1 ?? '',
    almacenaje2: api.almacenaje2 ?? '',
    valoralmacenaje2: toNum(api.valoralmacenaje2),
    docAlmacenaje2: api.doc_almacenaje2 ?? '',
    transnac: api.transnac ?? '',
    valortransnac: toNum(api.valortransnac),
    docTransnac: api.doc_transnac ?? '',
    agente: api.agente ?? '',
    valoragente: toNum(api.valoragente),
    docAgente: api.doc_agente ?? '',
    totalCompra: toNum(api.total_compra),
    totalCtaCobrar: toNum(api.total_ctacobrar),
    gastos: toNum(api.gastos),
    porcentajeGastos: toNum(api.porcentaje_gastos),
    pago1: toNum(api.pago1),
    pago2: toNum(api.pago2),
    pago3: toNum(api.pago3),
    transferencia: toNum(api.transferencia),
    detalles: (api.detalles ?? []).map((d) => ({
      descripcion: d.descripcion ?? '',
      ancho: toNum(d.ancho),
      alto: toNum(d.alto),
      unidades: toNum(d.unidades),
      valorfob: toNum(d.valorfob),
    })),
  };
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return String(value);
}
