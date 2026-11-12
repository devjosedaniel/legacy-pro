import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiTransferenciaTipo,
  TransferenciaTipo,
  mapTransferenciaTipo,
} from '../models/transferencia.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class TransferenciaTipoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/compra/transferencia-tipos`;
  private readonly activosSignal = signal<TransferenciaTipo[]>([]);
  private readonly todosSignal = signal<TransferenciaTipo[]>([]);

  readonly activos = this.activosSignal.asReadonly();
  readonly todos = this.todosSignal.asReadonly();

  loadActivos(): Observable<TransferenciaTipo[]> {
    return this.http.get<{ ok: boolean; tipos: ApiTransferenciaTipo[] }>(this.baseUrl).pipe(
      map((res) => (res.tipos ?? []).map(mapTransferenciaTipo)),
      tap((list) => this.activosSignal.set(list)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  loadTodos(): Observable<TransferenciaTipo[]> {
    const params = new HttpParams().set('todos', '1');
    return this.http.get<{ ok: boolean; tipos: ApiTransferenciaTipo[] }>(this.baseUrl, { params }).pipe(
      map((res) => (res.tipos ?? []).map(mapTransferenciaTipo)),
      tap((list) => {
        this.todosSignal.set(list);
        this.activosSignal.set(list.filter((item) => item.activo));
      }),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  create(data: {
    nombre: string;
    requiereProveedor: boolean;
    aplicaCxp: boolean;
  }): Observable<{ tipo: TransferenciaTipo; mensaje: string }> {
    return this.http
      .post<{ ok: boolean; tipo: ApiTransferenciaTipo; mensaje?: string }>(this.baseUrl, {
        nombre: data.nombre,
        requiere_proveedor: data.requiereProveedor,
        aplica_cxp: data.aplicaCxp,
      })
      .pipe(
        map((res) => ({
          tipo: mapTransferenciaTipo(res.tipo),
          mensaje: res.mensaje || 'Tipo creado.',
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  update(
    id: number,
    data: { nombre: string; requiereProveedor: boolean; aplicaCxp: boolean; orden?: number },
  ): Observable<{ tipo: TransferenciaTipo; mensaje: string }> {
    return this.http
      .put<{ ok: boolean; tipo: ApiTransferenciaTipo; mensaje?: string }>(`${this.baseUrl}/${id}`, {
        nombre: data.nombre,
        requiere_proveedor: data.requiereProveedor,
        aplica_cxp: data.aplicaCxp,
        orden: data.orden,
      })
      .pipe(
        map((res) => ({
          tipo: mapTransferenciaTipo(res.tipo),
          mensaje: res.mensaje || 'Tipo actualizado.',
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  setEstado(id: number, activo: boolean): Observable<{ tipo: TransferenciaTipo; mensaje: string }> {
    return this.http
      .post<{ ok: boolean; tipo: ApiTransferenciaTipo; mensaje?: string }>(`${this.baseUrl}/${id}/estado`, {
        estado: activo,
      })
      .pipe(
        map((res) => ({
          tipo: mapTransferenciaTipo(res.tipo),
          mensaje: res.mensaje || 'Tipo actualizado.',
        })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }
}
