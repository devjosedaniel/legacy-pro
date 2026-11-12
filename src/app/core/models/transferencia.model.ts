export interface TransferenciaTipo {
  id: number;
  nombre: string;
  codigo?: string;
  requiereProveedor: boolean;
  aplicaCxp: boolean;
  activo: boolean;
  orden: number;
  enUso: boolean;
}

export interface Banco {
  id: number;
  nombre: string;
  cuenta?: string;
  estado?: boolean;
}

export interface Transferencia {
  id: number;
  numero: string;
  fecha: string;
  tipoId: number | null;
  tipoLabel: string;
  valor: number;
  valorAplicado: number;
  saldo: number;
  motivo: string;
  proveedorId: number | null;
  proveedorNombre: string;
  beneficiario: string;
  bancoId: number | null;
  bancoNombre: string;
  referenciaBanco: string;
  activo: boolean;
  aplicaCxp: boolean;
  motivoAnula?: string;
  anuladoAt?: string;
  creadoNombre?: string;
}

export interface TransferenciaFormData {
  fecha: string;
  tipoId: number;
  valor: number;
  motivo: string;
  proveedorId: number | null;
  beneficiario: string;
  bancoId: number | null;
  referenciaBanco: string;
}

export interface ApiTransferenciaTipo {
  id: number;
  nombre: string;
  codigo?: string;
  requiere_proveedor?: boolean | number | string;
  aplica_cxp?: boolean | number | string;
  estado?: boolean | number | string;
  orden?: number;
  en_uso?: boolean | number | string;
}

export interface ApiTransferencia {
  id: number;
  numero: string;
  fecha: string;
  tipo_id?: number | null;
  tipo?: ApiTransferenciaTipo | null;
  tipo_label?: string;
  valor: number | string;
  valor_aplicado?: number | string;
  saldo?: number | string;
  motivo?: string | null;
  proveedor_id?: number | null;
  proveedor?: { id?: number; nombre?: string } | null;
  beneficiario?: string | null;
  banco_id?: number | null;
  banco?: { id?: number; nombre?: string; cuenta?: string } | null;
  referencia_banco?: string | null;
  estado?: boolean | number;
  aplica_cxp?: boolean;
  motivo_anula?: string | null;
  anulado_at?: string | null;
  creado_por?: { nombre?: string; usuario?: string } | null;
}

function asFlag(value: boolean | number | string | undefined): boolean {
  return value === true || value === 1 || value === '1';
}

export function mapTransferenciaTipo(api: ApiTransferenciaTipo): TransferenciaTipo {
  return {
    id: api.id,
    nombre: api.nombre,
    codigo: api.codigo,
    requiereProveedor: asFlag(api.requiere_proveedor),
    aplicaCxp: asFlag(api.aplica_cxp),
    activo: api.estado !== false && api.estado !== 0 && api.estado !== '0',
    orden: Number(api.orden ?? 0),
    enUso: asFlag(api.en_uso),
  };
}

export function mapTransferencia(api: ApiTransferencia): Transferencia {
  const tipo = api.tipo ? mapTransferenciaTipo(api.tipo) : null;
  return {
    id: api.id,
    numero: api.numero,
    fecha: typeof api.fecha === 'string' ? api.fecha.slice(0, 10) : String(api.fecha ?? ''),
    tipoId: api.tipo_id ?? tipo?.id ?? null,
    tipoLabel: api.tipo_label || tipo?.nombre || '',
    valor: Number(api.valor ?? 0),
    valorAplicado: Number(api.valor_aplicado ?? 0),
    saldo: Number(api.saldo ?? api.valor ?? 0),
    motivo: api.motivo ?? '',
    proveedorId: api.proveedor_id ?? api.proveedor?.id ?? null,
    proveedorNombre: api.proveedor?.nombre ?? '',
    beneficiario: api.beneficiario ?? api.proveedor?.nombre ?? '',
    bancoId: api.banco_id ?? api.banco?.id ?? null,
    bancoNombre: api.banco?.nombre ?? '',
    referenciaBanco: api.referencia_banco ?? '',
    activo: api.estado !== false && api.estado !== 0,
    aplicaCxp: api.aplica_cxp ?? tipo?.aplicaCxp ?? false,
    motivoAnula: api.motivo_anula ?? undefined,
    anuladoAt: api.anulado_at ?? undefined,
    creadoNombre: api.creado_por?.nombre || api.creado_por?.usuario || '',
  };
}
