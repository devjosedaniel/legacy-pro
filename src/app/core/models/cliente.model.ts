export interface Cliente {
  id: number;
  nombres: string;
  direccion?: string;
  contacto?: string;
  email1?: string;
  email2?: string;
  email3?: string;
  email4?: string;
  emailCobranza?: string;
  telefono?: string;
  movil?: string;
  pais?: string;
  ciudad?: string;
  tipoIdentificador?: string;
  identificador?: string;
  verPrecios?: boolean;
  montaje?: boolean;
  credito?: number;
  agenteRetencion?: boolean;
  vendedorId?: number | null;
  valorMinimo?: number | null;
  encid?: string | null;
  cotizid?: string | null;
  empresaId?: number | null;
  usuario?: string;
  password?: string;
  maxFechaFact?: number | null;
}

export interface ClienteContacto {
  id: number;
  nombre: string;
  email?: string;
  clienteId: number;
}

export interface ClienteFormData {
  nombres: string;
  tipoIdentificador: string;
  identificador: string;
  empresaId: number;
  pais: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  movil: string;
  contacto: string;
  credito: number;
  maxFechaFact: number | null;
  agenteRetencion: boolean;
  vendedorId: number | null;
  valorMinimo: number | null;
  verPrecios: boolean;
  montaje: boolean;
  email1: string;
  email2: string;
  email3: string;
  email4: string;
  emailCobranza: string;
  usuario: string;
  password: string;
}

export interface ApiCliente {
  id: number;
  nombres: string;
  direccion?: string | null;
  contacto?: string | null;
  email1?: string | null;
  email2?: string | null;
  email3?: string | null;
  email4?: string | null;
  email_cobranza?: string | null;
  telefono?: string | null;
  movil?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  tipoidentificador?: string | null;
  identificador?: string | null;
  verprecios?: number | boolean | null;
  montaje?: number | boolean | null;
  credito?: number | null;
  agente_retencion?: number | boolean | null;
  vendedor_id?: number | null;
  valorminimo?: number | string | null;
  encid?: string | null;
  cotizid?: string | null;
  empresa_id?: number | null;
  usuario?: string | null;
  password?: string | null;
  maxfechafact?: number | null;
}

export interface ApiClienteContacto {
  id: number;
  nombre: string;
  email?: string | null;
  cliente_id: number;
}

export function flagFromApi(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function mapCliente(api: ApiCliente): Cliente {
  const valorMinimo =
    api.valorminimo === null || api.valorminimo === undefined || api.valorminimo === ''
      ? null
      : Number(api.valorminimo);

  return {
    id: api.id,
    nombres: api.nombres,
    direccion: api.direccion ?? '',
    contacto: api.contacto ?? '',
    email1: api.email1 ?? '',
    email2: api.email2 ?? '',
    email3: api.email3 ?? '',
    email4: api.email4 ?? '',
    emailCobranza: api.email_cobranza ?? '',
    telefono: api.telefono ?? '',
    movil: api.movil ?? '',
    pais: api.pais ?? '',
    ciudad: api.ciudad ?? '',
    tipoIdentificador: api.tipoidentificador ?? '',
    identificador: api.identificador ?? '',
    verPrecios: flagFromApi(api.verprecios),
    montaje: flagFromApi(api.montaje),
    credito: Number(api.credito ?? 0),
    agenteRetencion: flagFromApi(api.agente_retencion),
    vendedorId: api.vendedor_id ?? null,
    valorMinimo: Number.isFinite(valorMinimo) ? valorMinimo : null,
    encid: api.encid ?? null,
    cotizid: api.cotizid ?? null,
    empresaId: api.empresa_id ?? null,
    usuario: api.usuario ?? '',
    password: api.password ?? '',
    maxFechaFact: api.maxfechafact ?? null,
  };
}

export function mapClienteContacto(api: ApiClienteContacto): ClienteContacto {
  return {
    id: api.id,
    nombre: api.nombre,
    email: api.email ?? '',
    clienteId: api.cliente_id,
  };
}

export function clienteToPayload(data: ClienteFormData): Record<string, unknown> {
  return {
    nombres: data.nombres.trim(),
    tipoidentificador: data.tipoIdentificador,
    identificador: data.identificador.trim(),
    empresa_id: data.empresaId,
    pais: data.pais.trim().toUpperCase(),
    ciudad: data.ciudad,
    direccion: data.direccion.trim(),
    telefono: data.telefono.trim(),
    movil: data.movil.trim(),
    contacto: data.contacto.trim(),
    credito: data.credito,
    maxfechafact: data.maxFechaFact,
    agente_retencion: data.agenteRetencion ? 1 : 0,
    vendedor_id: data.vendedorId,
    valorminimo: data.valorMinimo,
    verprecios: data.verPrecios ? 1 : 0,
    montaje: data.montaje ? 1 : 0,
    email1: data.email1.trim(),
    email2: data.email2.trim(),
    email3: data.email3.trim(),
    email4: data.email4.trim(),
    email_cobranza: data.emailCobranza.trim(),
    usuario: data.usuario.trim() || null,
    password: data.password || null,
  };
}
