import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiImportacion, Importacion, mapImportacion } from '../models/importacion.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class ImportacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/importacion`;

  list(params: {
    limite: number;
    pagina: number;
    busqueda?: string;
  }): Observable<{ items: Importacion[]; total: number }> {
    const httpParams = new HttpParams()
      .set('limite', String(params.limite))
      .set('pagina', String(params.pagina))
      .set('busqueda', params.busqueda ?? '');
    return this.http
      .get<{ ok: boolean; importaciones: ApiImportacion[]; cantidad: number }>(this.baseUrl, {
        params: httpParams,
      })
      .pipe(
        map((res) => ({
          items: (res.importaciones ?? []).map(mapImportacion),
          total: Number(res.cantidad ?? 0),
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: number): Observable<Importacion> {
    return this.http.get<{ ok: boolean; importacion: ApiImportacion }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapImportacion(res.importacion)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  create(data: Record<string, unknown>): Observable<string> {
    return this.http.post<{ ok: boolean; mensaje?: string }>(this.baseUrl, data).pipe(
      map((res) => res.mensaje || 'Importación agregada.'),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  update(id: number, data: Record<string, unknown>): Observable<string> {
    return this.http.put<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/${id}`, data).pipe(
      map((res) => res.mensaje || 'Importación actualizada.'),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  delete(id: number): Observable<string> {
    return this.http.delete<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.mensaje || 'Importación eliminada.'),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob', observe: 'response' }).pipe(
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
                return throwError(() => new Error(body.mensaje || 'No se pudo descargar el PDF.'));
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
