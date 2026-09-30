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
  orden?: string;
  grupo?: string;
  cliente?: string;
  clienteId?: string;
  calibre?: string;
  calibreId?: string;
}

@Injectable({ providedIn: 'root' })
export class GrupoProduccionService {
  private readonly http = inject(HttpClient);

  listActivos(filters?: GrupoHistorialFilters): Observable<GrupoProduccion[]> {
    let params = new HttpParams().set('estado', 'registrado');
    params = this.appendFilters(params, filters, false);

    return this.http
      .get<{ ok: boolean; grupos: ApiGrupo[] }>(`${environment.apiUrl}/produccion/grupos`, {
        params,
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
    params = this.appendFilters(params, filters, true);

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

  private appendFilters(
    params: HttpParams,
    filters: GrupoHistorialFilters | undefined,
    includeFechasUsuario: boolean,
  ): HttpParams {
    if (!filters) return params;

    if (includeFechasUsuario) {
      if (filters.fechaDesde) params = params.set('fecha_desde', filters.fechaDesde);
      if (filters.fechaHasta) params = params.set('fecha_hasta', filters.fechaHasta);
      if (filters.usuario) params = params.set('usuario', filters.usuario);
    }
    if (filters.orden) params = params.set('orden', filters.orden);
    if (filters.grupo) params = params.set('grupo', filters.grupo);
    if (filters.clienteId) params = params.set('cliente_id', filters.clienteId);
    else if (filters.cliente) params = params.set('cliente', filters.cliente);
    if (filters.calibreId) params = params.set('calibre_id', filters.calibreId);
    else if (filters.calibre) params = params.set('calibre', filters.calibre);

    return params;
  }
}
