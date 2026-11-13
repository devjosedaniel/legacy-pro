import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCategoria, CategoriaProveedor, mapCategoriaProveedor } from '../models/categoria.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categoria`;

  list(): Observable<CategoriaProveedor[]> {
    return this.http.get<{ categorias: ApiCategoria[] }>(this.baseUrl).pipe(
      map((res) => (res.categorias ?? []).map(mapCategoriaProveedor).filter((item) => item.activo)),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  listTodas(): Observable<CategoriaProveedor[]> {
    const params = new HttpParams().set('todos', '1');
    return this.http.get<{ categorias: ApiCategoria[] }>(this.baseUrl, { params }).pipe(
      map((res) => (res.categorias ?? []).map(mapCategoriaProveedor)),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  create(nombre: string): Observable<{ categoria: CategoriaProveedor; mensaje: string }> {
    return this.http
      .post<{ categoria: ApiCategoria; mensaje?: string }>(this.baseUrl, { nombre })
      .pipe(
        map((res) => ({
          categoria: mapCategoriaProveedor(res.categoria),
          mensaje: res.mensaje || 'Categoría creada.',
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  update(id: number, nombre: string): Observable<{ categoria: CategoriaProveedor; mensaje: string }> {
    return this.http
      .put<{ categoria: ApiCategoria; mensaje?: string }>(`${this.baseUrl}/${id}`, { nombre })
      .pipe(
        map((res) => ({
          categoria: mapCategoriaProveedor(res.categoria),
          mensaje: res.mensaje || 'Categoría actualizada.',
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  setEstado(id: number, activo: boolean): Observable<{ categoria: CategoriaProveedor; mensaje: string }> {
    return this.http
      .post<{ categoria: ApiCategoria; mensaje?: string }>(`${this.baseUrl}/${id}/estado`, { estado: activo })
      .pipe(
        map((res) => ({
          categoria: mapCategoriaProveedor(res.categoria),
          mensaje: res.mensaje || 'Categoría actualizada.',
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }
}
