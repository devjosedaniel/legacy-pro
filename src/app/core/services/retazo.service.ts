import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiRetazo } from '../models/api.model';
import { Retazo, RetazoCargaResult, RetazoCargaRow, RetazoEstado, RetazoFormData } from '../models/retazo.model';
import { extractApiError, mapRetazo } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class RetazoService {
  private readonly http = inject(HttpClient);

  listAll(filters?: {
    estado?: RetazoEstado | 'all';
    codigo?: string;
    productId?: string;
  }): Observable<Retazo[]> {
    let params = new HttpParams();

    if (filters?.estado && filters.estado !== 'all') {
      params = params.set('estado', filters.estado);
    } else if (filters?.estado === 'all') {
      params = params.set('estado', 'all');
    }

    if (filters?.codigo?.trim()) {
      params = params.set('codigo', filters.codigo.trim());
    }

    if (filters?.productId) {
      params = params.set('producto_id', filters.productId);
    }

    return this.http
      .get<{ ok: boolean; retazos: ApiRetazo[] }>(`${environment.apiUrl}/inv/retazos`, { params })
      .pipe(
        map((res) => res.retazos.map(mapRetazo)),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  listByProduct(productId: string, estado?: RetazoEstado | 'all'): Observable<Retazo[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }

    return this.http
      .get<{ ok: boolean; retazos: ApiRetazo[] }>(
        `${environment.apiUrl}/inv/productos/${productId}/retazos`,
        { params },
      )
      .pipe(
        map((res) => res.retazos.map(mapRetazo)),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  search(codigo: string): Observable<{ retazo?: Retazo; retazos: Retazo[] }> {
    const params = new HttpParams().set('codigo', codigo.trim());

    return this.http
      .get<{ ok: boolean; retazo?: ApiRetazo; retazos?: ApiRetazo[] }>(
        `${environment.apiUrl}/inv/retazos/buscar`,
        { params },
      )
      .pipe(
        map((res) => ({
          retazo: res.retazo ? mapRetazo(res.retazo) : undefined,
          retazos: (res.retazos ?? (res.retazo ? [res.retazo] : [])).map(mapRetazo),
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  create(data: RetazoFormData): Observable<Retazo> {
    const body: Record<string, unknown> = {
      producto_id: Number(data.productId),
      ancho: data.ancho,
      alto: data.alto,
      notas: data.notas,
    };

    if (data.movimientoOrigenId) body['movimiento_origen_id'] = data.movimientoOrigenId;
    if (data.loteOrigenId) body['lote_origen_id'] = data.loteOrigenId;
    if (data.codigo?.trim()) body['codigo'] = data.codigo.trim().toUpperCase();

    return this.http
      .post<{ ok: boolean; retazo: ApiRetazo }>(`${environment.apiUrl}/inv/retazos`, body)
      .pipe(
        map((res) => mapRetazo(res.retazo)),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  updateEstado(id: string, estado: RetazoEstado, notas?: string): Observable<Retazo> {
    const body: Record<string, unknown> = { estado };
    if (notas !== undefined) body['notas'] = notas;

    return this.http
      .put<{ ok: boolean; retazo: ApiRetazo }>(`${environment.apiUrl}/inv/retazos/${id}`, body)
      .pipe(
        map((res) => mapRetazo(res.retazo)),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  cargaInicial(rows: RetazoCargaRow[]): Observable<RetazoCargaResult> {
    const body = {
      retazos: rows.map((row) => ({
        sku: row.sku.trim().toUpperCase(),
        ancho: row.ancho,
        alto: row.alto,
        codigo: row.codigo?.trim() || undefined,
        notas: row.notas?.trim() || undefined,
      })),
    };

    return this.http
      .post<{
        ok: boolean;
        mensaje: string;
        creados: ApiRetazo[];
        errores: { linea: number; mensaje: string }[];
        total_creados: number;
        total_errores: number;
      }>(`${environment.apiUrl}/inv/retazos/carga-inicial`, body)
      .pipe(
        map((res) => ({
          creados: res.creados.map(mapRetazo),
          errores: res.errores,
          totalCreados: res.total_creados,
          totalErrores: res.total_errores,
          mensaje: res.mensaje,
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }
}
