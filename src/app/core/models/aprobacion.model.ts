export interface AprobacionColor {
  id: number;
  color: string;
  lado: string;
  lineatura?: string | number | null;
  puntominimo?: string | number | null;
  procesar?: number | boolean;
  digicap?: string | null;
}

export interface AprobacionRegistro {
  aprobado: number;
  sugerencia?: string | null;
  pruebacolor?: number;
  fotopolimero?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AprobacionEtapa {
  etapa_id?: number;
  cotizacion_id?: number | null;
  fechaaprobacion?: string | null;
}

export interface AprobacionTrabajo {
  id: number;
  secuencia?: number;
  referencia?: string;
  detalle?: string;
  es_cransa?: number;
  es_duplicacion?: number;
  ancho?: number | string | null;
  alto?: number | string | null;
  largo?: number | string | null;
  repeticionancho?: number | string | null;
  repeticionalto?: number | string | null;
  anchomaterial?: number | string | null;
  tipoimpresion?: string | null;
  distorsion?: string | number | null;
  porcentaje?: string | number | null;
  producto?: { nombre?: string } | null;
  calibre?: { nombre?: string } | null;
  _maquina?: { nombre?: string } | null;
  _troquel?: { nombre?: string } | null;
  _distorsion?: { cilindro?: string } | null;
  etapa?: AprobacionEtapa | null;
  colores?: AprobacionColor[];
}

export interface AprobacionArchivo {
  id: number;
  nombre: string;
  tipo?: string | null;
  peso?: number | string | null;
  carpeta?: string | null;
  aprobacion?: AprobacionRegistro | null;
  trabajo: AprobacionTrabajo;
}

export interface AprobacionCola {
  id: number;
  nombre: string;
}

export interface AprobacionCaracteristicas {
  colas?: AprobacionCola[];
  calibres?: unknown[];
  distorsiones?: unknown[];
  productos?: unknown[];
}

export interface AprobacionDetalleResponse {
  ok?: boolean;
  mensaje?: string;
  archivo?: AprobacionArchivo;
  caracteristicas?: AprobacionCaracteristicas;
}

export interface AprobacionAccionResponse {
  ok?: boolean;
  mensaje?: string;
  archivo?: AprobacionArchivo;
}
