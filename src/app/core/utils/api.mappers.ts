import { Category, ProductCategorySlug } from '../models/category.model';
import {
  LoteStock,
  Movement,
  MovementType,
  ProductStock,
  StockTipo,
} from '../models/movement.model';
import { Product } from '../models/product.model';
import { Retazo, RetazoHistorialItem } from '../models/retazo.model';
import { Perfil } from '../models/perfil.model';
import { SistemaUsuario, UsuarioRol } from '../models/usuario.model';
import { User } from '../models/user.model';
import { parseDirectorios } from './directorios.util';
import {
  ApiCategoria,
  ApiLoteStock,
  ApiMovimiento,
  ApiProducto,
  ApiRetazo,
  ApiRetazoHistorialEvento,
  ApiStock,
  ApiPerfil,
  ApiUsuario,
} from '../models/api.model';

export function mapCategoria(api: ApiCategoria): Category {
  return {
    id: String(api.id),
    slug: api.slug,
    name: api.nombre,
    description: api.descripcion ?? '',
    icon: api.icono ?? '📦',
    active: api.activo,
  };
}

export function mapProducto(api: ApiProducto): Product {
  const slug = (api.categoria?.slug ?? 'otros') as ProductCategorySlug;
  const product: Product = {
    id: String(api.id),
    nombre: api.nombre,
    categoryId: String(api.categoria_id),
    categorySlug: slug,
    sku: api.sku ?? '',
    stockMinimo: api.stock_minimo,
    unidad: api.unidad,
    activo: api.activo,
    notas: api.notas ?? undefined,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };

  if (
    slug === 'planchas' &&
    api.marca_id != null &&
    api.calibre_id != null &&
    api.ancho != null &&
    api.alto != null
  ) {
    product.plancha = {
      marcaId: String(api.marca_id),
      marca: api.marca?.nombre ?? '',
      calibreId: String(api.calibre_id),
      calibre: api.calibre?.nombre ?? String(api.calibre_id),
      medidas: { ancho: Number(api.ancho), alto: Number(api.alto) },
    };
  }

  if (slug === 'stickyback' && api.marca_id != null && api.ancho != null && api.alto != null) {
    product.stickyback = {
      marcaId: String(api.marca_id),
      marca: api.marca?.nombre ?? '',
      medidas: { ancho: Number(api.ancho), largo: Number(api.alto) },
    };
  }

  if (slug === 'flexoback' && api.marca_id != null && api.ancho != null && api.alto != null) {
    product.flexoback = {
      marcaId: String(api.marca_id),
      marca: api.marca?.nombre ?? '',
      medidas: { ancho: Number(api.ancho), largo: Number(api.alto) },
    };
  }

  return product;
}

export function mapRetazo(api: ApiRetazo): Retazo {
  const movimiento = api.movimiento_origen;
  const creador = api.creado_por ?? (api as ApiRetazo & { creadoPor?: ApiRetazo['creado_por'] }).creadoPor;

  return {
    id: String(api.id),
    productId: String(api.producto_id),
    productoNombre: api.producto?.nombre,
    categorySlug: api.producto?.categoria?.slug,
    movimientoOrigenId: api.movimiento_origen_id ? String(api.movimiento_origen_id) : undefined,
    movimientoOrigen: movimiento
      ? {
          numero: movimiento.numero,
          tipo: movimiento.tipo,
          direccion: movimiento.direccion,
          cantidad: movimiento.cantidad,
          stockTipo: movimiento.stock_tipo,
          proveedor: movimiento.proveedor ?? undefined,
          numeroLote: movimiento.numero_lote,
          fechaRegistro: movimiento.created_at,
        }
      : undefined,
    loteOrigenId: api.lote_origen_id ? String(api.lote_origen_id) : undefined,
    codigo: api.codigo,
    ancho: Number(api.ancho),
    alto: Number(api.alto),
    origen: api.origen as Retazo['origen'],
    estado: api.estado as Retazo['estado'],
    notas: api.notas ?? undefined,
    createdAt: api.created_at,
    loteNumero: api.lote_origen?.numero_lote,
    movimientoOrigenNumero: movimiento?.numero,
    creadoPorNombre: formatApiUsuarioNombre(creador),
  };
}

export function mapRetazoHistorial(api: ApiRetazoHistorialEvento): RetazoHistorialItem {
  return {
    id: `${api.retazo_id}-${api.evento}-${api.fecha}`,
    retazoId: String(api.retazo_id),
    codigo: api.codigo,
    productId: String(api.producto_id),
    productoNombre: api.producto?.nombre,
    ancho: Number(api.ancho),
    alto: Number(api.alto),
    origen: api.origen as Retazo['origen'],
    evento: api.evento,
    direccion: api.direccion,
    fecha: api.fecha,
    movimientoOrigenId: api.movimiento_origen?.id ? String(api.movimiento_origen.id) : undefined,
    movimientoOrigenNumero: api.movimiento_origen?.numero,
    loteNumero: api.lote_origen?.numero_lote,
    usuario: formatApiUsuarioNombre(api.usuario ?? undefined),
  };
}

function formatApiUsuarioNombre(
  usuario?: { nombre: string | null; usuario: string } | null,
): string | undefined {
  if (!usuario) return undefined;
  return usuario.nombre?.trim() || usuario.usuario?.trim() || undefined;
}

export function mapStock(api: ApiStock): ProductStock {
  return {
    productId: api.productId,
    propio: api.propio,
    consignacion: api.consignacion,
    cliente: api.cliente ?? 0,
    total: api.total,
    lotes: api.lotes.map(mapLote),
  };
}

export function mapLote(api: ApiLoteStock): LoteStock {
  return {
    productId: api.productId,
    numeroLote: api.numeroLote,
    fechaIngreso: api.fechaIngreso,
    fechaExpiracion: api.fechaExpiracion,
    stockTipo: api.stockTipo,
    proveedor: api.proveedor,
    cantidad: api.cantidad,
    loteId: api.loteId,
  };
}

export function mapMovimiento(api: ApiMovimiento): Movement {
  const slug = (api.producto?.categoria?.slug ?? 'planchas') as ProductCategorySlug;
  const creador = api.creado_por ?? (api as ApiMovimiento & { creadoPor?: ApiMovimiento['creado_por'] }).creadoPor;
  const anulador =
    api.anulado_por ??
    (api as ApiMovimiento & { anuladoPor?: ApiMovimiento['anulado_por'] }).anuladoPor;
  const usuario =
    creador?.nombre?.trim() ||
    creador?.usuario?.trim() ||
    '';
  const anuladoPor =
    anulador?.nombre?.trim() ||
    anulador?.usuario?.trim() ||
    undefined;

  const inactivo = api.estado === false;

  return {
    id: String(api.id),
    numero: api.numero,
    grupoId: api.grupo_id ?? undefined,
    ingresoNumero: api.ingreso_numero ?? undefined,
    activo: !inactivo,
    puedeAnular: !inactivo && (api.puede_anular ?? true),
    anuladoAt: api.anulado_at ?? undefined,
    anuladoPor,
    direccion: api.direccion,
    tipo: api.tipo as MovementType,
    productId: String(api.producto_id),
    categorySlug: slug,
    cantidad: api.cantidad,
    stockTipo: api.stock_tipo as StockTipo,
    proveedor:
      api.proveedor ??
      api.proveedor_entidad?.nombre ??
      (api as ApiMovimiento & { proveedorEntidad?: { nombre: string } }).proveedorEntidad?.nombre ??
      undefined,
    proveedorId: api.proveedor_id != null ? String(api.proveedor_id) : undefined,
    numeroLote: api.numero_lote,
    fechaIngreso: (api.fecha_ingreso ?? api.created_at).split('T')[0],
    fechaExpiracion: api.fecha_expiracion ?? undefined,
    documentoRef: api.documento_ref ?? undefined,
    motivo: api.motivo ?? undefined,
    clienteTrabajo: api.cliente_trabajo ?? undefined,
    notas: api.notas ?? undefined,
    usuario,
    fechaRegistro: api.created_at,
    stockTotalDespues: api.stock_total_despues ?? undefined,
    stockPropioDespues: api.stock_propio_despues ?? undefined,
    stockConsignacionDespues: api.stock_consignacion_despues ?? undefined,
    stockClienteDespues: api.stock_cliente_despues ?? undefined,
    materialKardex: api.material_kardex ?? undefined,
    retazosOrigen: api.retazos_origen?.map((retazo) => ({
      id: String(retazo.id),
      codigo: retazo.codigo,
      ancho: Number(retazo.ancho),
      alto: Number(retazo.alto),
      estado: retazo.estado,
    })),
  };
}

export function mapUsuario(api: ApiUsuario): User {
  const initials = (api.nombre ?? api.usuario)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return {
    id: String(api.id),
    name: api.nombre?.trim() || api.usuario,
    email: api.email ?? '',
    role: mapRol(api.rol),
    avatar: initials,
    perfilId: api.perfil_id != null ? String(api.perfil_id) : undefined,
    directorios: parseDirectorios(api.directorios ?? api.perfil?.directorios),
  };
}

function mapRol(rol: string): User['role'] {
  const value = rol.toLowerCase();
  if (value.includes('admin')) return 'admin';
  if (value.includes('visor')) return 'visor';
  return 'operador';
}

export function mapPerfil(api: ApiPerfil): Perfil {
  return {
    id: String(api.id),
    nombre: api.nombre,
    directorios: parseDirectorios(api.directorios),
    correoTrabajos: Boolean(api.correotrabajos),
  };
}

export function mapSistemaUsuario(api: ApiUsuario): SistemaUsuario {
  const rol = (api.rol ?? 'ROL_USER') as UsuarioRol;
  return {
    id: String(api.id),
    usuario: api.usuario,
    nombre: api.nombre?.trim() || '',
    email: api.email ?? '',
    rol,
    perfilId: api.perfil_id != null ? String(api.perfil_id) : api.perfil ? String(api.perfil.id) : '',
    perfilNombre: api.perfil?.nombre ?? '',
    empresaId: api.empresa_id ?? 1,
    mensajeria: Boolean(api.mensajeria),
    ultimaConexion: api.ultima_conexion ?? undefined,
  };
}

export function rolLabel(rol: string): string {
  if (rol === 'ROL_ADMIN') return 'Administrador';
  if (rol === 'ROL_USER') return 'Usuario';
  return rol;
}

export function extractApiError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: { mensaje?: string; message?: string } }).error;
    if (body?.mensaje) return body.mensaje;
    if (body?.message) return body.message;
  }
  if (error instanceof Error) return error.message;
  return 'Error de comunicación con el servidor.';
}
