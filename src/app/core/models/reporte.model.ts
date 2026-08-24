export interface RetazoDisponibleReporteItem {
  id: number;
  codigo: string;
  ancho: number;
  alto: number;
  medidas: string;
  areaCm2: number;
  origen: string;
  origenLabel: string;
}

export interface RetazoDisponibleReporteProducto {
  productoId: number;
  productoNombre: string;
  productoSku: string;
  retazos: RetazoDisponibleReporteItem[];
  cantidad: number;
  areaTotalCm2: number;
}

export interface RetazoDisponibleReporteCalibre {
  calibreId: number;
  calibreNombre: string;
  productos: RetazoDisponibleReporteProducto[];
  cantidad: number;
  areaTotalCm2: number;
}

export interface RetazosDisponiblesReporte {
  generadoPor: string;
  generadoEl: string;
  totalRetazos: number;
  grupos: RetazoDisponibleReporteCalibre[];
}
