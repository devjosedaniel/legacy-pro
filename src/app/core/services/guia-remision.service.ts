import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiGuiaRemision,
  GuiaRemision,
  GuiaRemisionDetalle,
} from '../models/guia-remision.model';
import { PaginatedResult } from '../models/pagination.model';
import { extractApiError } from '../utils/api.mappers';

export interface GuiaRemisionPageFilters {
  page?: number;
  pageSize?: number;
  busqueda?: string;
  clienteId?: number | null;
  estadoComprobante?: string | null;
}

function isFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function padSecuencia(value?: string | number | null): string {
  if (value == null || value === '') return '';
  return String(value).padStart(5, '0');
}

function formatOpSecuencia(secuencia?: string): string | undefined {
  if (!secuencia?.trim()) return undefined;
  const value = secuencia.trim();
  if (/^op/i.test(value)) return value.replace(/^op/i, 'OP');
  return `OP ${value}`;
}

const ESTADOS_HOJA_CERRADA = new Set([6, 7, 8]);

function mapGuia(api: ApiGuiaRemision): GuiaRemision {
  const estadoOrdenId = api.produccion?.estadoorden_id;
  return {
    id: api.id,
    secuencia: padSecuencia(api.secuencia),
    fecha: api.fecha,
    numeroDocumento: api.numero_documento ?? undefined,
    detalle: api.detalle ?? '',
    ciudad: api.ciudad ?? undefined,
    informacion: api.informacion ?? undefined,
    orden: api.orden ?? undefined,
    bitacora: api.bitacora ?? undefined,
    calibreNombre: api.calibre?.nombre,
    clienteNombre: api.cliente?.nombres ?? '—',
    ordenProduccionId: api.produccion?.id,
    ordenProduccionSecuencia: formatOpSecuencia(api.produccion?.secuencia),
    noSeFactura: api.produccion?.motivo ? !isFlag(api.produccion.motivo.facturar) : false,
    anulado: isFlag(api.anulado),
    facturado: isFlag(api.facturado),
    estadoComprobante: api.estado_comprobante ?? undefined,
    numeroAutorizacion: api.numero_autorizacion ?? undefined,
    urlRide: api.url_ride ?? undefined,
    mensajeError: api.mensaje_error ?? undefined,
    archivo: api.archivo ?? undefined,
    tieneProduccion: !!api.produccion?.id,
    puedeEditarHoja: !!api.produccion?.id && !ESTADOS_HOJA_CERRADA.has(Number(estadoOrdenId)),
    creadoPor: api.creado?.nombre?.trim() || api.creado?.usuario,
    createdAt: api.created_at,
  };
}

function mapDetalle(api: ApiGuiaRemision): GuiaRemisionDetalle {
  return {
    ...mapGuia(api),
    lineatura: api.lineatura ?? undefined,
    reposo: api.reposo ?? undefined,
    shorea: api.shorea ?? undefined,
    alturaRelieve: api.alturarelieve ?? undefined,
    espesorPiso: api.espesorpiso ?? undefined,
    espesorRelieve: api.espesorrelieve ?? undefined,
    totalCms: api.totalcms != null && api.totalcms !== '' ? Number(api.totalcms) : undefined,
    lineas: (api.detalles ?? []).map((linea) => ({
      id: linea.id,
      productoNombre: linea.producto?.nombre ?? '—',
      descripcion: linea.descripcion ?? '',
      ancho: Number(linea.ancho ?? 0),
      alto: Number(linea.alto ?? 0),
      cantidad: Number(linea.cantidad ?? 0),
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class GuiaRemisionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notas-entrega`;

  fetchPage(filters: GuiaRemisionPageFilters = {}): Observable<PaginatedResult<GuiaRemision>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 15;
    let params = new HttpParams().set('pagina', String(page)).set('limite', String(pageSize));

    const busqueda = filters.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (filters.clienteId) {
      params = params.set('cliente_id', String(filters.clienteId));
    }
    if (filters.estadoComprobante) {
      params = params.set('estado_comprobante', filters.estadoComprobante);
    }

    return this.http
      .get<{ ok: boolean; notas: ApiGuiaRemision[]; cantidad: number }>(this.baseUrl, { params })
      .pipe(
        map((res) => ({
          items: (res.notas ?? []).map(mapGuia),
          total: res.cantidad ?? 0,
          page,
          pageSize,
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.get<{ ok: boolean; nota: ApiGuiaRemision }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapDetalle(res.nota)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  pdfUrl(id: number): string {
    return `${this.baseUrl}/${id}/pdf1`;
  }

  pdfContinuoUrl(id: number): string {
    return `${this.baseUrl}/${id}/pdf`;
  }

  certificadoUrl(id: number): string {
    return `${this.baseUrl}/${id}/pdfcertificado`;
  }

  pdfRideUrl(id: number): string {
    return `${this.baseUrl}/${id}/pdf-ride`;
  }

  previewUrl(id: number): string {
    return `${this.baseUrl}/${id}/preview`;
  }

  anular(id: number): Observable<string> {
    return this.action(this.http.get<{ ok?: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/anular`));
  }

  enviar(id: number): Observable<string> {
    return this.action(this.http.get<{ ok?: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/mail`));
  }

  generar(id: number): Observable<string> {
    return this.action(this.http.get<{ ok?: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/generar`));
  }

  actualizarHojaSeguridad(
    id: number,
    datos: {
      lineatura: string;
      reposo: string;
      shorea: string;
      alturarelieve: string;
      espesorpiso: string;
      espesorrelieve: string;
    },
  ): Observable<string> {
    return this.action(
      this.http.post<{ ok?: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/hoja-seguridad`, datos),
    );
  }

  private action(request$: Observable<{ ok?: boolean; mensaje?: string }>): Observable<string> {
    return request$.pipe(
      map((res) => res.mensaje ?? 'Operación realizada.'),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }
}
