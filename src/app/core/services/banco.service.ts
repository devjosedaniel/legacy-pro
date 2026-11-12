import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Banco } from '../models/transferencia.model';
import { extractApiError } from '../utils/api.mappers';
import { CachedLoader } from '../utils/cached-load.util';

interface ApiBanco {
  id: number;
  nombre: string;
  cuenta?: string;
  estado?: boolean | number;
}

@Injectable({ providedIn: 'root' })
export class BancoService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<Banco[]>([]);
  private readonly loaded = signal(false);
  private readonly loader = new CachedLoader<Banco[]>();

  readonly all = this.items.asReadonly();

  ensureLoaded(): Observable<Banco[]> {
    if (this.loaded()) {
      return of(this.items());
    }
    return this.fetch();
  }

  private fetch(): Observable<Banco[]> {
    return this.loader.load(() =>
      this.http.get<{ bancos: ApiBanco[] }>(`${environment.apiUrl}/banco`).pipe(
        map((res) =>
          (res.bancos ?? [])
            .filter((banco) => banco.estado !== false && banco.estado !== 0)
            .map((banco) => ({
              id: banco.id,
              nombre: banco.nombre,
              cuenta: banco.cuenta,
              estado: banco.estado !== false && banco.estado !== 0,
            })),
        ),
        tap((list) => {
          this.items.set(list);
          this.loaded.set(true);
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      ),
    );
  }
}
