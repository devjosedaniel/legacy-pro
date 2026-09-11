import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCliente, Cliente } from '../models/cliente.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);

  list(): Observable<Cliente[]> {
    return this.http
      .get<{ ok: boolean; clientes: ApiCliente[] }>(`${environment.apiUrl}/cliente/opciones`)
      .pipe(
        catchError((err) => {
          const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 0;
          if (status === 404 || status === 400) {
            return this.http.get<{ ok: boolean; clientes: ApiCliente[] }>(`${environment.apiUrl}/cliente`);
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
}
