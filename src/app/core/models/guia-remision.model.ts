export interface GuiaRemisionLinea {
  id: number;
  productoNombre: string;
  descripcion: string;
  ancho: number;
  alto: number;
  cantidad: number;
}

export interface GuiaRemision {
  id: number;
  secuencia: string;
  fecha?: string;
  numeroDocumento?: string;
  detalle: string;
  ciudad?: string;
  informacion?: string;
  orden?: string;
  bitacora?: string;
  calibreNombre?: string;
  clienteNombre: string;
  ordenProduccionId?: number;
  ordenProduccionSecuencia?: string;
  noSeFactura: boolean;
  anulado: boolean;
  facturado: boolean;
  estadoComprobante?: string;
  numeroAutorizacion?: string;
  urlRide?: string;
  mensajeError?: string;
  archivo?: string;
  tieneProduccion: boolean;
  puedeEditarHoja: boolean;
  creadoPor?: string;
  createdAt?: string;
}

export interface GuiaRemisionDetalle extends GuiaRemision {
  lineatura?: string;
  reposo?: string;
  shorea?: string;
  alturaRelieve?: string;
  espesorPiso?: string;
  espesorRelieve?: string;
  totalCms?: number;
  lineas: GuiaRemisionLinea[];
}

export interface ApiGuiaRemision {
  id: number;
  secuencia: string;
  fecha?: string;
  numero_documento?: string | null;
  detalle?: string;
  ciudad?: string | null;
  informacion?: string | null;
  orden?: string | null;
  bitacora?: string | null;
  anulado?: number | boolean;
  facturado?: number | boolean;
  estado_comprobante?: string | null;
  numero_autorizacion?: string | null;
  url_ride?: string | null;
  mensaje_error?: string | null;
  archivo?: string | null;
  lineatura?: string | null;
  reposo?: string | null;
  shorea?: string | null;
  alturarelieve?: string | null;
  espesorpiso?: string | null;
  espesorrelieve?: string | null;
  totalcms?: number | string | null;
  created_at?: string;
  cliente?: { id: number; nombres: string };
  calibre?: { id: number; nombre: string } | null;
  creado?: { nombre?: string | null; usuario?: string };
  produccion?: {
    id: number;
    secuencia: string;
    estadoorden_id?: number;
    motivo?: { facturar?: number | boolean } | null;
  } | null;
  detalles?: Array<{
    id: number;
    descripcion?: string;
    ancho?: number | string;
    alto?: number | string;
    cantidad?: number | string;
    producto?: { nombre?: string };
  }>;
}
