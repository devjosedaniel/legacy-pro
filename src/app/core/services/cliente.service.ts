import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiCliente,
  ApiClienteContacto,
  Cliente,
  ClienteContacto,
  ClienteFormData,
  clienteToPayload,
  mapCliente,
  mapClienteContacto,
} from '../models/cliente.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cliente`;

  /** Catálogo corto (id + nombre) para filtros de producción y cotizaciones. */
  list(): Observable<Cliente[]> {
    return this.http
      .get<{ ok: boolean; clientes: ApiCliente[] }>(`${this.baseUrl}/opciones`)
      .pipe(
        catchError((err) => {
          const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 0;
          if (status === 404 || status === 400) {
            return this.http.get<{ ok: boolean; clientes: ApiCliente[] }>(this.baseUrl);
          }
          return throwError(() => err);
        }),
        map((res) =>
          (res.clientes ?? [])
            .map((cliente) => ({ id: cliente.id, nombres: cliente.nombres }))
            .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es')),
        ),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  listAll(): Observable<Cliente[]> {
    return this.http.get<{ ok: boolean; clientes: ApiCliente[] }>(this.baseUrl).pipe(
      map((res) => (res.clientes ?? []).map(mapCliente)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  getById(id: number): Observable<Cliente> {
    return this.http.get<{ ok: boolean; cliente: ApiCliente }>(`${this.baseUrl}/${id}`).pipe(
      map((res) => mapCliente(res.cliente)),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  create(data: ClienteFormData): Observable<Cliente> {
    return this.http
      .post<{ ok: boolean; mensaje?: string; cliente: ApiCliente }>(this.baseUrl, clienteToPayload(data))
      .pipe(
        map((res) => mapCliente(res.cliente)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  update(id: number, data: ClienteFormData): Observable<Cliente> {
    return this.http
      .put<{ ok: boolean; mensaje?: string; cliente: ApiCliente }>(
        `${this.baseUrl}/${id}`,
        clienteToPayload(data),
      )
      .pipe(
        map((res) => mapCliente(res.cliente)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/${id}`).pipe(
      map(() => void 0),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  contactos(clienteId: number): Observable<ClienteContacto[]> {
    return this.http
      .get<{ ok: boolean; contactos: ApiClienteContacto[] }>(`${this.baseUrl}/${clienteId}/contactos`)
      .pipe(
        map((res) => (res.contactos ?? []).map(mapClienteContacto)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  uploadExcel(file: File): Observable<string> {
    const body = new FormData();
    body.append('file0', file);
    return this.http.post<{ ok: boolean; mensaje?: string }>(`${this.baseUrl}/upload`, body).pipe(
      map((res) => res.mensaje || 'Archivo subido correctamente'),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }
}
