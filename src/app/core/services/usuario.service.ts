import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiUsuario } from '../models/api.model';
import { SistemaUsuario, UsuarioFormData } from '../models/usuario.model';
import { extractApiError, mapSistemaUsuario } from '../utils/api.mappers';

const DEFAULT_EMPRESA_ID = 1;

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<SistemaUsuario[]>([]);

  readonly all = this.items.asReadonly();

  load(): Observable<SistemaUsuario[]> {
    return this.http.get<{ ok: boolean; usuarios: ApiUsuario[] }>(`${environment.apiUrl}/usuario`).pipe(
      map((res) => (res.usuarios ?? []).map(mapSistemaUsuario)),
      tap((list) => this.items.set(list)),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  fetchById(id: string): Observable<SistemaUsuario> {
    return this.http.get<{ ok: boolean; usuario: ApiUsuario }>(`${environment.apiUrl}/usuario/${id}`).pipe(
      map((res) => mapSistemaUsuario(res.usuario)),
      tap((usuario) => {
        this.items.update((list) => {
          const exists = list.some((item) => item.id === usuario.id);
          return exists
            ? list.map((item) => (item.id === usuario.id ? usuario : item))
            : [...list, usuario];
        });
      }),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  create(data: UsuarioFormData): Observable<SistemaUsuario> {
    return this.http
      .post<{ ok: boolean; mensaje?: string; usuario: ApiUsuario }>(
        `${environment.apiUrl}/usuario`,
        this.toPayload(data, true),
      )
      .pipe(
        map((res) => mapSistemaUsuario(res.usuario)),
        tap((usuario) => this.items.update((list) => [...list, usuario])),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  update(id: string, data: UsuarioFormData): Observable<SistemaUsuario> {
    return this.http
      .put<{ ok: boolean; mensaje?: string; usuario: ApiUsuario }>(
        `${environment.apiUrl}/usuario/${id}`,
        this.toPayload(data, false),
      )
      .pipe(
        map((res) => mapSistemaUsuario(res.usuario)),
        tap((usuario) =>
          this.items.update((list) => list.map((item) => (item.id === usuario.id ? usuario : item))),
        ),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ ok: boolean; mensaje?: string }>(`${environment.apiUrl}/usuario/${id}`)
      .pipe(
        map(() => void 0),
        tap(() => this.items.update((list) => list.filter((item) => item.id !== id))),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  private toPayload(data: UsuarioFormData, isCreate: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      usuario: data.usuario.trim(),
      nombre: data.nombre.trim() || null,
      email: data.email.trim() || null,
      rol: data.rol,
      perfil_id: Number(data.perfilId),
      empresa_id: DEFAULT_EMPRESA_ID,
      mensajeria: data.mensajeria,
    };

    if (isCreate || data.password.trim()) {
      body['password'] = data.password;
    }

    return body;
  }
}
