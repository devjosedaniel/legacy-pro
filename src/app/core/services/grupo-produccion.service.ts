import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiGrupo, GrupoProduccion } from '../models/grupo-produccion.model';
import { extractApiError } from '../utils/api.mappers';
import { mapGrupo } from '../utils/grupo.mapper';

export interface GrupoHistorialPage {
  items: GrupoProduccion[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GrupoHistorialFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  usuario?: string;
}

@Injectable({ providedIn: 'root' })
export class GrupoProduccionService {
  private readonly http = inject(HttpClient);

  listActivos(): Observable<GrupoProduccion[]> {
    return this.http
      .get<{ ok: boolean; grupos: ApiGrupo[] }>(`${environment.apiUrl}/produccion/grupos`, {
        params: { estado: 'registrado' },
      })
      .pipe(
        map((res) => (res.grupos ?? []).map(mapGrupo)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  fetchHistorial(
    page = 1,
    pageSize = 10,
    filters?: GrupoHistorialFilters,
  ): Observable<GrupoHistorialPage> {
    let params = new HttpParams()
      .set('pagina', String(page))
      .set('limite', String(pageSize));

    if (filters?.fechaDesde) {
      params = params.set('fecha_desde', filters.fechaDesde);
    }
    if (filters?.fechaHasta) {
      params = params.set('fecha_hasta', filters.fechaHasta);
    }
    if (filters?.usuario) {
      params = params.set('usuario', filters.usuario);
    }

    return this.http
      .get<{
        ok: boolean;
        grupos: ApiGrupo[];
        cantidad_total?: number;
        pagina?: number;
        limite?: number;
      }>(`${environment.apiUrl}/produccion/grupos/historial`, { params })
      .pipe(
        map((res) => ({
          items: (res.grupos ?? []).map(mapGrupo),
          total: res.cantidad_total ?? res.grupos?.length ?? 0,
          page: res.pagina ?? page,
          pageSize: res.limite ?? pageSize,
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: string | number): Observable<GrupoProduccion> {
    return this.http
      .get<{ ok: boolean; grupo: ApiGrupo }>(`${environment.apiUrl}/produccion/grupos/${id}`)
      .pipe(
        map((res) => mapGrupo(res.grupo)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getHistorialById(id: string | number): Observable<GrupoProduccion> {
    return this.http
      .get<{ ok: boolean; grupo: ApiGrupo }>(
        `${environment.apiUrl}/produccion/grupos/historial/${id}`,
      )
      .pipe(
        map((res) => mapGrupo(res.grupo)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }
}
