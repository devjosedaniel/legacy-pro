import { ProductCategorySlug } from './category.model';
import { MovementDirection, MovementType, StockTipo } from './movement.model';

export interface ApiCategoria {
  id: number;
  slug: ProductCategorySlug;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  activo: boolean;
}

export interface ApiProducto {
  id: number;
  categoria_id: number;
  nombre: string;
  sku: string | null;
  stock_minimo: number;
  unidad: string;
  notas: string | null;
  marca_id: number | null;
  calibre_id: number | null;
  ancho: number | null;
  alto: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: ApiCategoria;
  calibre?: { id: number; nombre: string };
  marca?: { id: number; nombre: string; categoria_id: number };
  stock?: ApiStock;
}

export interface ApiLoteStock {
  productId: string;
  numeroLote: string;
  fechaIngreso: string;
  stockTipo: StockTipo;
  proveedor?: string;
  cantidad: number;
  loteId?: number;
}

export interface ApiStock {
  productId: string;
  propio: number;
  consignacion: { proveedor: string; cantidad: number }[];
  total: number;
  lotes: ApiLoteStock[];
}

export interface ApiMovimiento {
  id: number;
  numero: string;
  producto_id: number;
  tipo: MovementType;
  direccion: MovementDirection;
  cantidad: number;
  stock_tipo: StockTipo;
  numero_lote: string;
  fecha_ingreso: string | null;
  proveedor: string | null;
  documento_ref: string | null;
  motivo: string | null;
  cliente_trabajo: string | null;
  notas: string | null;
  created_at: string;
  producto?: ApiProducto;
  creado_por?: { id: number; nombre: string | null; usuario: string };
}

export interface ApiUsuario {
  id: number;
  usuario: string;
  nombre: string | null;
  email: string | null;
  rol: string;
}

export interface AuthResponse {
  token: string;
  usuario: ApiUsuario;
  exp: number;
}

export interface ApiErrorBody {
  ok?: boolean;
  mensaje?: string;
  message?: string;
}

export interface ApiRetazo {
  id: number;
  producto_id: number;
  movimiento_origen_id: number | null;
  lote_origen_id: number | null;
  codigo: string;
  ancho: number;
  alto: number;
  origen: string;
  estado: string;
  notas: string | null;
  created_at: string;
  producto?: ApiProducto;
  lote_origen?: { id: number; numero_lote: string };
  movimiento_origen?: { id: number; numero: string };
}
