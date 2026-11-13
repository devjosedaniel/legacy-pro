import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiProveedor, Proveedor, ProveedorFormData, mapProveedor } from '../models/proveedor.model';
import { extractApiError } from '../utils/api.mappers';
import { CachedLoader } from '../utils/cached-load.util';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<Proveedor[]>([]);
  private readonly loaded = signal(false);
  private readonly catalogLoader = new CachedLoader<Proveedor[]>();
  private readonly baseUrl = `${environment.apiUrl}/proveedor`;

  readonly all = this.items.asReadonly();

  load(): Observable<Proveedor[]> {
    return this.fetchProveedores(true);
  }

  ensureLoaded(): Observable<Proveedor[]> {
    if (this.loaded()) {
      return of(this.items());
    }
    return this.fetchProveedores();
  }

  getById(id: string): Proveedor | undefined {
    return this.items().find((p) => p.id === id);
  }

  get(id: number): Observable<Proveedor> {
    return this.http.get<{ ok: boolean; proveedor: ApiProveedor }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapProveedor(res.proveedor)),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  create(data: ProveedorFormData): Observable<{ proveedor: Proveedor; mensaje: string }> {
    return this.http
      .post<{ ok: boolean; proveedor: ApiProveedor; mensaje?: string }>(this.baseUrl, this.toPayload(data))
      .pipe(
        map((res) => ({
          proveedor: mapProveedor(res.proveedor),
          mensaje: res.mensaje || 'Proveedor agregado correctamente.',
        })),
        tap(() => this.invalidate()),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  update(id: number, data: ProveedorFormData): Observable<{ proveedor: Proveedor; mensaje: string }> {
    return this.http
      .put<{ ok: boolean; proveedor: ApiProveedor; mensaje?: string }>(`${this.baseUrl}/${id}`, this.toPayload(data))
      .pipe(
        map((res) => ({
          proveedor: mapProveedor(res.proveedor),
          mensaje: res.mensaje || 'Proveedor actualizado correctamente.',
        })),
        tap(() => this.invalidate()),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  delete(id: string | number): Observable<string> {
    return this.http.delete<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => res.mensaje || 'Proveedor eliminado correctamente.'),
      tap(() => this.invalidate()),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  private fetchProveedores(force = false): Observable<Proveedor[]> {
    return this.catalogLoader.load(
      () =>
        this.http.get<{ ok: boolean; proveedores: ApiProveedor[] }>(this.baseUrl).pipe(
          map((res) => (res.proveedores ?? []).map(mapProveedor)),
          tap((list) => {
            this.items.set(list);
            this.loaded.set(true);
          }),
          catchError((error) => throwError(() => new Error(extractApiError(error)))),
        ),
      force,
    );
  }

  private invalidate(): void {
    this.loaded.set(false);
    this.catalogLoader.invalidate();
  }

  private toPayload(data: ProveedorFormData) {
    return {
      nombre: data.nombre,
      identificador: data.identificador || null,
      tipo_persona: data.tipoPersona,
      email: data.email || null,
      contacto: data.contacto || null,
      telefonos: data.telefonos || null,
      direccion: data.direccion || null,
      descripcion: data.descripcion || null,
      categorias_id: data.categoriasId,
    };
  }
}
