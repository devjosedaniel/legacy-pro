export const TIPOS_PERSONA_PROVEEDOR = [
  { id: 1, nombre: 'Natural' },
  { id: 2, nombre: 'Jurídica' },
] as const;

export function tipoPersonaNombre(tipo: number | null | undefined): string {
  if (tipo === 1) return 'Natural';
  if (tipo === 2) return 'Jurídica';
  return '—';
}

export interface ProveedorCategoria {
  id: number;
  nombre: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  identificador?: string;
  tipoPersona: number;
  email?: string;
  contacto?: string;
  telefonos?: string;
  direccion?: string;
  descripcion?: string;
  activo: boolean;
  categorias: ProveedorCategoria[];
}

export interface ProveedorFormData {
  nombre: string;
  identificador: string;
  tipoPersona: number;
  email: string;
  contacto: string;
  telefonos: string;
  direccion: string;
  descripcion: string;
  categoriasId: Array<number | string>;
}

export interface ApiProveedorCategoria {
  id?: number;
  categoria_id?: number;
  categoria?: { id?: number; nombre?: string } | null;
}

export interface ApiProveedor {
  id: number;
  nombre: string;
  identificador?: string | null;
  tipo_persona?: number | string | null;
  email?: string | null;
  contacto?: string | null;
  telefonos?: string | null;
  direccion?: string | null;
  descripcion?: string | null;
  estado?: boolean | number;
  categorias?: ApiProveedorCategoria[];
}

export function mapProveedor(api: ApiProveedor): Proveedor {
  return {
    id: String(api.id),
    nombre: api.nombre,
    identificador: api.identificador ?? undefined,
    tipoPersona: Number(api.tipo_persona ?? 2) || 2,
    email: api.email ?? undefined,
    contacto: api.contacto ?? undefined,
    telefonos: api.telefonos ?? undefined,
    direccion: api.direccion ?? undefined,
    descripcion: api.descripcion ?? undefined,
    activo: api.estado !== false && api.estado !== 0,
    categorias: (api.categorias ?? [])
      .map((item) => ({
        id: Number(item.categoria?.id ?? item.categoria_id ?? item.id ?? 0),
        nombre: item.categoria?.nombre ?? '',
      }))
      .filter((item) => item.id > 0),
  };
}
