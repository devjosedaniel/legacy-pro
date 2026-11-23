import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSriRecibido, SriRecibido, mapSriRecibido } from '../models/sri-recibido.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class SriRecibidoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sri/recibidos`;

  list(params: {
    limite: number;
    pagina: number;
    busqueda?: string;
    estado?: string;
    tipo?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    vista?: 'lista' | 'cuarentena';
  }): Observable<{
    items: SriRecibido[];
    total: number;
    pendientes: number;
    errores: number;
    enProceso: boolean;
  }> {
    let httpParams = new HttpParams()
      .set('limite', String(params.limite))
      .set('pagina', String(params.pagina))
      .set('busqueda', params.busqueda ?? '');
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params.fechaDesde) httpParams = httpParams.set('fecha_desde', params.fechaDesde);
    if (params.fechaHasta) httpParams = httpParams.set('fecha_hasta', params.fechaHasta);
    if (params.vista) httpParams = httpParams.set('vista', params.vista);

    return this.http
      .get<{
        ok: boolean;
        recibidos: ApiSriRecibido[];
        cantidad: number;
        pendientes: number;
        errores?: number;
        en_proceso?: boolean;
      }>(this.baseUrl, {
        params: httpParams,
      })
      .pipe(
        map((res) => ({
          items: (res.recibidos ?? []).map(mapSriRecibido),
          total: Number(res.cantidad ?? 0),
          pendientes: Number(res.pendientes ?? 0),
          errores: Number(res.errores ?? 0),
          enProceso: !!res.en_proceso,
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: number): Observable<SriRecibido> {
    return this.http.get<{ ok: boolean; recibido: ApiSriRecibido }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapSriRecibido(res.recibido)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  importar(claves: string, archivo: File | null): Observable<string> {
    const body = new FormData();
    body.append('claves', claves);
    if (archivo) {
      body.append('archivo', archivo);
    }
    return this.http
      .post<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/importar`, body)
      .pipe(
        map((res) => res.mensaje || 'Comprobantes importados.'),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  consultarLote(reintentar = false): Observable<{
    mensaje: string;
    pendientes: number;
    errores: number;
    enProceso: boolean;
  }> {
    return this.http
      .post<{
        ok: boolean;
        mensaje?: string;
        pendientes: number;
        errores?: number;
        en_proceso?: boolean;
      }>(`${this.baseUrl}/consultar`, { reintentar: reintentar })
      .pipe(
        map((res) => ({
          mensaje: res.mensaje || 'Consulta enviada al SRI.',
          pendientes: Number(res.pendientes ?? 0),
          errores: Number(res.errores ?? 0),
          enProceso: !!res.en_proceso,
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  ingresarRetencion(id: number, facturaId?: number): Observable<string> {
    const body: { factura_id?: number } = {};
    if (facturaId) body.factura_id = facturaId;
    return this.http
      .post<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/ingresar`, body)
      .pipe(
        map((res) => res.mensaje || 'Retención ingresada.'),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  consultarUno(id: number): Observable<SriRecibido> {
    return this.http
      .post<{ ok: boolean; recibido: ApiSriRecibido }>(`${this.baseUrl}/${id}/consultar`, {})
      .pipe(
        map((res) => mapSriRecibido(res.recibido)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.fetchBlob(`${this.baseUrl}/${id}/pdf`);
  }

  downloadXml(id: number): Observable<Blob> {
    return this.fetchBlob(`${this.baseUrl}/${id}/xml`);
  }

  private fetchBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(
      map((res) => {
        const blob = res.body;
        if (!blob || blob.size === 0) {
          throw new Error('El archivo está vacío.');
        }
        return blob;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
          return from(error.error.text()).pipe(
            switchMap((text) => {
              try {
                const body = JSON.parse(text) as { mensaje?: string };
                return throwError(() => new Error(body.mensaje || 'No se pudo descargar el archivo.'));
              } catch {
                return throwError(() => new Error(extractApiError(error)));
              }
            }),
          );
        }
        return throwError(() => new Error(extractApiError(error)));
      }),
    );
  }
}
