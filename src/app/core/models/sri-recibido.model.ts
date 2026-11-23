export interface ApiSriRecibidoDetalle {
  id: number;
  linea: number;
  codigo: string | null;
  descripcion: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  descuento: number | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  cod_sustento?: string | null;
  cod_doc?: string | null;
  tipo_doc?: string | null;
  numero_doc?: string | null;
  fecha_doc?: string | null;
  clave_acceso_doc?: string | null;
  num_aut_doc?: string | null;
  importe_doc?: number | null;
  impuesto?: string | null;
  porcentaje?: number | null;
  factura_id?: number | null;
}

export interface ApiSriDocSustento {
  cod_sustento?: string | null;
  cod_doc?: string | null;
  tipo_doc?: string | null;
  numero?: string | null;
  fecha?: string | null;
  clave_acceso_doc?: string | null;
  num_aut_doc?: string | null;
  importe_total?: number | null;
  factura_id?: number | null;
}

export interface ApiSriFacturaVinculoItem {
  id: number;
  numero_documento: string | null;
  fecha: string | null;
  total: number | null;
  subtotal: number | null;
  cliente: string | null;
  identificador: string | null;
  tiene_retencion: boolean;
  puede_ingresar: boolean;
  motivo: string | null;
}

export interface ApiSriFacturaVinculo {
  doc_sustento?: string | null;
  estado: 'encontrada' | 'varias' | 'no_encontrada';
  mensaje: string;
  facturas: ApiSriFacturaVinculoItem[];
}

export interface ApiSriRecibido {
  id: number;
  clave_acceso: string;
  tipo_comprobante: string | null;
  tipo_nombre: string | null;
  ambiente: string | null;
  estado: string;
  numero_autorizacion: string | null;
  fecha_autorizacion: string | null;
  fecha_emision: string | null;
  ruc_emisor: string | null;
  razon_social_emisor: string | null;
  nombre_comercial_emisor: string | null;
  estab: string | null;
  pto_emi: string | null;
  secuencial: string | null;
  numero: string | null;
  ruc_receptor: string | null;
  razon_social_receptor: string | null;
  subtotal: number | null;
  descuento: number | null;
  iva: number | null;
  total: number | null;
  moneda: string | null;
  mensaje_error: string | null;
  consultas: number;
  consultado_at: string | null;
  cuarentena_at?: string | null;
  en_cuarentena?: boolean;
  tiene_xml: boolean;
  created_at?: string;
  detalles?: ApiSriRecibidoDetalle[];
  docs_sustento?: ApiSriDocSustento[];
  factura_vinculo?: ApiSriFacturaVinculo | null;
}

export interface SriRecibidoDetalle {
  id: number;
  linea: number;
  codigo: string;
  descripcion: string;
  cantidad: number | null;
  precioUnitario: number | null;
  descuento: number | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  tipoDoc: string;
  numeroDoc: string;
  fechaDoc: string;
  claveAccesoDoc: string;
  numAutDoc: string;
  importeDoc: number | null;
  impuesto: string;
  porcentaje: number | null;
  facturaId: number | null;
}

export interface SriFacturaVinculoItem {
  id: number;
  numeroDocumento: string;
  fecha: string;
  total: number | null;
  subtotal: number | null;
  cliente: string;
  identificador: string;
  tieneRetencion: boolean;
  puedeIngresar: boolean;
  motivo: string;
}

export interface SriFacturaVinculo {
  docSustento: string;
  estado: 'encontrada' | 'varias' | 'no_encontrada';
  mensaje: string;
  facturas: SriFacturaVinculoItem[];
}

export interface SriDocSustento {
  tipoDoc: string;
  numero: string;
  fecha: string;
  claveAccesoDoc: string;
  numAutDoc: string;
  importeTotal: number | null;
  facturaId: number | null;
}

export interface SriRecibido {
  id: number;
  claveAcceso: string;
  tipoComprobante: string;
  tipoNombre: string;
  ambiente: string;
  estado: string;
  numeroAutorizacion: string;
  fechaAutorizacion: string;
  fechaEmision: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  nombreComercialEmisor: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  numero: string;
  rucReceptor: string;
  razonSocialReceptor: string;
  subtotal: number | null;
  descuento: number | null;
  iva: number | null;
  total: number | null;
  moneda: string;
  mensajeError: string;
  consultas: number;
  consultadoAt: string;
  cuarentenaAt: string;
  enCuarentena: boolean;
  tieneXml: boolean;
  detalles: SriRecibidoDetalle[];
  docsSustento: SriDocSustento[];
  facturaVinculo: SriFacturaVinculo | null;
}

export const SRI_TIPOS: Array<{ id: string; nombre: string }> = [
  { id: '01', nombre: 'Factura' },
  { id: '03', nombre: 'Liquidación' },
  { id: '04', nombre: 'Nota de crédito' },
  { id: '05', nombre: 'Nota de débito' },
  { id: '06', nombre: 'Guía de remisión' },
  { id: '07', nombre: 'Retención' },
];

export function mapSriRecibido(api: ApiSriRecibido): SriRecibido {
  return {
    id: api.id,
    claveAcceso: api.clave_acceso,
    tipoComprobante: api.tipo_comprobante ?? '',
    tipoNombre: api.tipo_nombre ?? 'Comprobante',
    ambiente: api.ambiente ?? '',
    estado: api.estado,
    numeroAutorizacion: api.numero_autorizacion ?? '',
    fechaAutorizacion: api.fecha_autorizacion ?? '',
    fechaEmision: api.fecha_emision ?? '',
    rucEmisor: api.ruc_emisor ?? '',
    razonSocialEmisor: api.razon_social_emisor ?? '',
    nombreComercialEmisor: api.nombre_comercial_emisor ?? '',
    estab: api.estab ?? '',
    ptoEmi: api.pto_emi ?? '',
    secuencial: api.secuencial ?? '',
    numero: api.numero ?? '',
    rucReceptor: api.ruc_receptor ?? '',
    razonSocialReceptor: api.razon_social_receptor ?? '',
    subtotal: api.subtotal,
    descuento: api.descuento,
    iva: api.iva,
    total: api.total,
    moneda: api.moneda ?? 'DOLAR',
    mensajeError: api.mensaje_error ?? '',
    consultas: api.consultas ?? 0,
    consultadoAt: api.consultado_at ?? '',
    cuarentenaAt: api.cuarentena_at ?? '',
    enCuarentena: !!api.en_cuarentena,
    tieneXml: !!api.tiene_xml,
    detalles: (api.detalles ?? []).map((linea) => ({
      id: linea.id,
      linea: linea.linea,
      codigo: linea.codigo ?? '',
      descripcion: linea.descripcion ?? '',
      cantidad: linea.cantidad,
      precioUnitario: linea.precio_unitario,
      descuento: linea.descuento,
      subtotal: linea.subtotal,
      iva: linea.iva,
      total: linea.total,
      tipoDoc: linea.tipo_doc ?? '',
      numeroDoc: linea.numero_doc ?? '',
      fechaDoc: linea.fecha_doc ?? '',
      claveAccesoDoc: linea.clave_acceso_doc ?? '',
      numAutDoc: linea.num_aut_doc ?? '',
      importeDoc: linea.importe_doc ?? null,
      impuesto: linea.impuesto ?? '',
      porcentaje: linea.porcentaje ?? null,
      facturaId: linea.factura_id ?? null,
    })),
    docsSustento: (api.docs_sustento ?? []).map((doc) => ({
      tipoDoc: doc.tipo_doc ?? '',
      numero: doc.numero ?? '',
      fecha: doc.fecha ?? '',
      claveAccesoDoc: doc.clave_acceso_doc ?? '',
      numAutDoc: doc.num_aut_doc ?? '',
      importeTotal: doc.importe_total ?? null,
      facturaId: doc.factura_id ?? null,
    })),
    facturaVinculo: api.factura_vinculo
      ? {
          docSustento: api.factura_vinculo.doc_sustento ?? '',
          estado: api.factura_vinculo.estado,
          mensaje: api.factura_vinculo.mensaje,
          facturas: (api.factura_vinculo.facturas ?? []).map((f) => ({
            id: f.id,
            numeroDocumento: f.numero_documento ?? '',
            fecha: f.fecha ?? '',
            total: f.total,
            subtotal: f.subtotal,
            cliente: f.cliente ?? '',
            identificador: f.identificador ?? '',
            tieneRetencion: !!f.tiene_retencion,
            puedeIngresar: !!f.puede_ingresar,
            motivo: f.motivo ?? '',
          })),
        }
      : null,
  };
}
