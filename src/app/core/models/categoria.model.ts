export interface CategoriaProveedor {
  id: number;
  nombre: string;
  activo: boolean;
  enUso: boolean;
}

export interface ApiCategoria {
  id: number;
  nombre: string;
  estado?: boolean | number;
  proveedores_count?: number;
}

export function mapCategoriaProveedor(api: ApiCategoria): CategoriaProveedor {
  return {
    id: api.id,
    nombre: api.nombre,
    activo: api.estado !== false && api.estado !== 0,
    enUso: Number(api.proveedores_count ?? 0) > 0,
  };
}
