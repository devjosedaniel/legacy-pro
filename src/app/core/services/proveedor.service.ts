import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proveedor } from '../models/proveedor.model';
import { extractApiError } from '../utils/api.mappers';

interface ApiProveedor {
  id: number;
  nombre: string;
  identificador?: string | null;
  estado: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<Proveedor[]>([]);
  private readonly loaded = signal(false);

  readonly all = this.items.asReadonly();

  load(): Observable<Proveedor[]> {
    return this.http
      .get<{ ok: boolean; proveedores: ApiProveedor[] }>(`${environment.apiUrl}/proveedor`)
      .pipe(
        map((res) => res.proveedores.map((p) => this.mapProveedor(p))),
        tap((list) => {
          this.items.set(list);
          this.loaded.set(true);
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  ensureLoaded(): Observable<Proveedor[]> {
    if (this.loaded()) {
      return of(this.items());
    }
    return this.load();
  }

  getById(id: string): Proveedor | undefined {
    return this.items().find((p) => p.id === id);
  }

  private mapProveedor(api: ApiProveedor): Proveedor {
    return {
      id: String(api.id),
      nombre: api.nombre,
      identificador: api.identificador ?? undefined,
      activo: api.estado,
    };
  }
}
