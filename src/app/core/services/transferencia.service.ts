import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiTransferencia,
  Transferencia,
  TransferenciaFormData,
  mapTransferencia,
} from '../models/transferencia.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class TransferenciaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/compra/transferencias`;

  list(params: {
    limite: number;
    pagina: number;
    busqueda?: string;
    tipoId?: number | null;
    proveedorId?: number | null;
    estado?: 'activos' | 'anulados';
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<{ items: Transferencia[]; total: number }> {
    let httpParams = new HttpParams()
      .set('limite', String(params.limite))
      .set('pagina', String(params.pagina))
      .set('busqueda', params.busqueda ?? '')
      .set('estado', params.estado ?? 'activos');
    if (params.tipoId) {
      httpParams = httpParams.set('tipo_id', String(params.tipoId));
    }
    if (params.proveedorId) {
      httpParams = httpParams.set('proveedor_id', String(params.proveedorId));
    }
    if (params.fechaDesde) {
      httpParams = httpParams.set('fecha_desde', params.fechaDesde);
    }
    if (params.fechaHasta) {
      httpParams = httpParams.set('fecha_hasta', params.fechaHasta);
    }

    return this.http
      .get<{ ok: boolean; transferencias: ApiTransferencia[]; cantidad: number }>(this.baseUrl, {
        params: httpParams,
      })
      .pipe(
        map((res) => ({
          items: (res.transferencias ?? []).map(mapTransferencia),
          total: Number(res.cantidad ?? 0),
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: number): Observable<Transferencia> {
    return this.http.get<{ ok: boolean; transferencia: ApiTransferencia }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapTransferencia(res.transferencia)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  create(data: TransferenciaFormData): Observable<{ transferencia: Transferencia; mensaje: string }> {
    return this.http
      .post<{ ok: boolean; transferencia: ApiTransferencia; mensaje?: string }>(this.baseUrl, {
        fecha: data.fecha,
        tipo_id: data.tipoId,
        valor: data.valor,
        motivo: data.motivo || null,
        proveedor_id: data.proveedorId,
        beneficiario: data.beneficiario || null,
        banco_id: data.bancoId,
        referencia_banco: data.referenciaBanco || null,
      })
      .pipe(
        map((res) => ({
          transferencia: mapTransferencia(res.transferencia),
          mensaje: res.mensaje || 'Transferencia registrada.',
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  anular(id: number, motivo: string): Observable<string> {
    return this.http
      .post<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/${id}/anular`, { motivo })
      .pipe(
        map((res) => res.mensaje || 'Transferencia anulada.'),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  downloadReporte(
    formato: 'pdf' | 'excel',
    params: {
      fechaDesde: string;
      fechaHasta: string;
      busqueda?: string;
      tipoId?: number | null;
      proveedorId?: number | null;
      estado?: 'activos' | 'anulados';
    },
  ): Observable<Blob> {
    let httpParams = new HttpParams()
      .set('fecha_desde', params.fechaDesde)
      .set('fecha_hasta', params.fechaHasta)
      .set('estado', params.estado ?? 'activos')
      .set('busqueda', params.busqueda ?? '');
    if (params.tipoId) {
      httpParams = httpParams.set('tipo_id', String(params.tipoId));
    }
    if (params.proveedorId) {
      httpParams = httpParams.set('proveedor_id', String(params.proveedorId));
    }

    return this.http
      .get(`${this.baseUrl}/${formato}`, {
        params: httpParams,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((res) => {
          const blob = res.body;
          if (!blob || blob.size === 0) {
            throw new Error('El archivo está vacío.');
          }
          const type = blob.type || res.headers.get('Content-Type') || '';
          if (type.includes('application/json')) {
            throw new Error('No se pudo generar el reporte.');
          }
          return blob;
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
            return from(error.error.text()).pipe(
              switchMap((text) => {
                try {
                  const body = JSON.parse(text) as { mensaje?: string };
                  return throwError(() => new Error(body.mensaje || 'No se pudo generar el reporte.'));
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
