export type MaterialTipo = 'plancha' | 'retazo';
export type GrupoEstado = 'borrador' | 'material_asignado' | 'registrado' | 'terminado';

export interface RetazoSobrante {
  id?: number;
  codigo?: string;
  ancho: number;
  alto: number;
  notas?: string;
}

export interface GrupoMaterial {
  tipo: MaterialTipo;
  productoId?: number;
  productoNombre?: string;
  productoSku?: string;
  loteId?: number;
  loteNumero?: string;
  retazoId?: number;
  retazoCodigo?: string;
  retazoAncho?: number;
  retazoAlto?: number;
}

export interface GrupoOrdenResumen {
  id: number;
  secuencia: string;
  calibreId: number;
  calibreNombre: string;
  clienteNombre?: string;
  trabajoSecuencia?: string;
  detalle?: string;
  urgencia?: number;
  completaEnPlancha?: boolean;
}

export interface GrupoProduccion {
  id: string;
  backendId?: number;
  ordenes: GrupoOrdenResumen[];
  material: GrupoMaterial | null;
  calibreId: number | null;
  calibreNombre: string | null;
  estado: GrupoEstado;
  notas?: string;
  movimientoId?: number;
  movimientoNumero?: string;
  registradoPor?: string;
  terminadoPor?: string;
  terminadoAt?: string;
  retazosSobrantes?: RetazoSobrante[];
  materialAnchoCm?: number;
  materialAltoCm?: number;
  areaMaterialCm2?: number;
  areaUsadaCm2?: number;
  consumoCm2?: number;
  desperdicioCm2?: number;
  areaSobrantesCm2?: number;
  armadoArchivoNombre?: string;
  armadoPiezas?: ArmadoPiezaPreview[];
  armadoMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadoPlanchaSize {
  ancho_mm: number;
  alto_mm: number;
  ancho_cm: number;
  alto_cm: number;
}

export interface ArmadoPiezaPreview {
  indice: number;
  numero: number;
  nombre: string;
  separacion: string;
  x_cm: number;
  y_cm: number;
  ancho_cm: number;
  alto_cm: number;
  angulo: number;
  colocada?: boolean;
  bleed_cm?: { x: number; y: number };
  polygon_cm?: number[];
  x_mm?: number;
  y_mm?: number;
  ancho_mm?: number;
  alto_mm?: number;
  bleed_mm?: { x: number; y: number };
  polygon_mm?: number[];
}

export interface ArmadoImportData {
  archivo_nombre?: string | null;
  cantidad_piezas: number;
  cantidad_colocadas?: number;
  plancha: ArmadoPlanchaSize;
  layout?: ArmadoPlanchaSize | null;
  piezas: ArmadoPiezaPreview[];
  metadata?: Record<string, unknown>;
}

export interface ApiGrupoMaterial {
  tipo: MaterialTipo;
  producto_id?: number;
  producto_nombre?: string;
  producto_sku?: string | null;
  lote_id?: number;
  lote_numero?: string;
  retazo_id?: number;
  retazo_codigo?: string;
  retazo_ancho?: number;
  retazo_alto?: number;
}

export interface ApiGrupo {
  id: number;
  calibre_id: number;
  calibre?: { id: number; nombre: string };
  material: ApiGrupoMaterial;
  ordenes: Array<{
    id: number;
    secuencia: string;
    calibre_id: number;
    calibre?: { id: number; nombre: string };
    cliente?: { nombres: string };
    trabajo?: { secuencia: string };
    detalle?: string;
    completa?: boolean;
    urgencia?: number;
  }>;
  movimiento_id?: number | null;
  movimiento?: {
    id: number;
    numero: string;
    created_by: number;
    creado_por?: { id: number; nombre: string | null; usuario: string };
  } | null;
  estado: string;
  notas?: string | null;
  created_by: number;
  creado_por?: { id: number; nombre: string | null; usuario: string };
  terminado_at?: string | null;
  terminado_por?: { id: number; nombre: string | null; usuario: string };
  retazos_sobrantes?: Array<{
    id: number;
    codigo: string;
    ancho: number;
    alto: number;
    notas?: string | null;
  }>;
  material_ancho_cm?: number | null;
  material_alto_cm?: number | null;
  area_material_cm2?: number | null;
  area_usada_cm2?: number | null;
  consumo_cm2?: number | null;
  desperdicio_cm2?: number | null;
  area_sobrantes_cm2?: number | null;
  armado_archivo_nombre?: string | null;
  armado_piezas?: ArmadoPiezaPreview[] | null;
  armado_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const MATERIAL_LABELS: Record<MaterialTipo, string> = {
  plancha: 'Plancha',
  retazo: 'Retazo',
};

export const GRUPO_ESTADO_LABELS: Record<GrupoEstado, string> = {
  borrador: 'En armado',
  material_asignado: 'Material asignado',
  registrado: 'Armado registrado',
  terminado: 'En producción',
};
