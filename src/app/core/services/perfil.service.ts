import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiPerfil } from '../models/api.model';
import { PERMISO_MODULOS } from '../models/permiso.model';
import { Perfil, PerfilFormData } from '../models/perfil.model';
import { extractApiError, mapPerfil } from '../utils/api.mappers';
import { CachedLoader } from '../utils/cached-load.util';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<Perfil[]>([]);
  private readonly loaded = signal(false);
  private readonly loader = new CachedLoader<Perfil[]>();

  readonly all = this.items.asReadonly();

  ensureLoaded(): Observable<Perfil[]> {
    if (this.loaded()) {
      return of(this.items());
    }
    return this.fetch(false);
  }

  refresh(): Observable<Perfil[]> {
    return this.fetch(true);
  }

  fetchById(id: string): Observable<Perfil> {
    return this.http.get<{ ok: boolean; perfil: ApiPerfil }>(`${environment.apiUrl}/perfil/${id}`).pipe(
      map((res) => mapPerfil(res.perfil)),
      tap((perfil) => {
        this.items.update((list) => {
          const exists = list.some((item) => item.id === perfil.id);
          return exists
            ? list.map((item) => (item.id === perfil.id ? perfil : item))
            : [...list, perfil];
        });
      }),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  create(data: PerfilFormData): Observable<void> {
    return this.http
      .post<{ ok: boolean; mensaje?: string }>(`${environment.apiUrl}/perfil`, this.toPayload(data))
      .pipe(
        tap(() => this.invalidate()),
        map(() => void 0),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  update(id: string, data: PerfilFormData): Observable<void> {
    return this.http
      .put<{ ok: boolean; mensaje?: string }>(`${environment.apiUrl}/perfil/${id}`, this.toPayload(data))
      .pipe(
        tap(() => this.invalidate()),
        map(() => void 0),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<{ ok: boolean; mensaje?: string }>(`${environment.apiUrl}/perfil/${id}`).pipe(
      tap(() => {
        this.items.update((list) => list.filter((item) => item.id !== id));
        this.loader.set(this.items());
      }),
      map(() => void 0),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  private toPayload(data: PerfilFormData): Record<string, unknown> {
    const selected = new Set(data.directorios);
    const directorios = PERMISO_MODULOS.flatMap((modulo) =>
      modulo.paginas.map((pagina) => ({
        id: pagina.id,
        check: selected.has(pagina.id),
      })),
    );

    return {
      nombre: data.nombre.trim(),
      correotrabajos: data.correoTrabajos,
      directorios,
    };
  }

  private fetch(force: boolean): Observable<Perfil[]> {
    return this.loader.load(
      () =>
        this.http.get<{ ok: boolean; perfiles: ApiPerfil[] }>(`${environment.apiUrl}/perfil`).pipe(
          map((res) => (res.perfiles ?? []).map(mapPerfil)),
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
    this.loader.invalidate();
  }
}
