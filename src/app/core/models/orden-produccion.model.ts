export interface OrdenProduccion {
  id: number;
  secuencia: string;
  detalle?: string;
  calibreId: number;
  calibreNombre: string;
  clienteNombre: string;
  trabajoSecuencia?: string;
  estadoOrdenNombre?: string;
  etapaNombre?: string;
  urgencia: number;
  creadoPor?: string;
  createdAt?: string;
}

export interface OrdenProduccionLinea {
  id: number;
  productoNombre: string;
  color: string;
  cantidad?: number;
  ancho?: number;
  alto?: number;
  lado?: string;
  angulo?: string;
  porcentajeTinta?: number;
  coberturaTinta?: number;
  lineatura?: string;
  puntoMinimo?: string;
  digicap?: string;
}

export interface OrdenProduccionMedida {
  id: number;
  color: string;
  ancho: number;
  alto: number;
  cantidad: number;
}

export interface OrdenProduccionDetalle extends OrdenProduccion {
  ciudad?: string;
  motivoNombre?: string;
  tipoImpresion?: string;
  distorsion?: string;
  observacion?: string;
  intelligentFlexo?: boolean | null;
  vps?: string;
  medida?: string;
  asunto?: string;
  importante?: string;
  importanteProducto?: string;
  coloresCount: number;
  fechaInicio?: string;
  fechaProceso?: string;
  lineas: OrdenProduccionLinea[];
  medidas: OrdenProduccionMedida[];
  archivosCount: number;
}

export interface ApiOrdenProduccion {
  id: number;
  secuencia: string;
  detalle?: string;
  calibre_id: number;
  urgencia?: number;
  created_at?: string;
  ciudad?: string;
  tipoimpresion?: string;
  distorsion?: string;
  observacion?: string;
  ifx?: boolean | number | null;
  medida?: string;
  asunto?: string;
  importante?: string;
  importante_producto?: string;
  fechainicio?: string;
  fechaproceso?: string;
  calibre?: { id: number; nombre: string };
  cliente?: { id: number; nombres: string };
  trabajo?: { id: number; secuencia: string; vps?: string };
  motivo?: { id: number; nombre: string };
  estadoorden?: string;
  etapa?: { etapa?: { nombre?: string } };
  creado?: { nombre?: string; usuario?: string };
  detalles?: ApiOrdenProduccionLinea[];
  medidas?: ApiOrdenProduccionMedida[];
  archivos?: unknown[];
}

export interface ApiOrdenProduccionLinea {
  id: number;
  color: string;
  cantidad?: number;
  ancho?: number;
  alto?: number;
  lado?: string;
  angulo?: string;
  porcentaje_tinta?: number;
  cobertura_tinta?: number;
  lineatura?: string;
  puntominimo?: string;
  digicap?: string;
  producto?: { id: number; nombre: string };
}

export interface ApiOrdenProduccionMedida {
  id: number;
  color: string;
  ancho: number;
  alto: number;
  cantidad: number;
}
