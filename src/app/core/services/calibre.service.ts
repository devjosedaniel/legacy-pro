import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Calibre } from '../models/calibre.model';
import { extractApiError } from '../utils/api.mappers';
import { CachedLoader } from '../utils/cached-load.util';

interface ApiCalibre {
  id: number;
  nombre: string;
  estado: boolean;
}

@Injectable({ providedIn: 'root' })
export class CalibreService {
  private readonly http = inject(HttpClient);
  private readonly calibres = signal<Calibre[]>([]);
  private readonly loaded = signal(false);
  private readonly catalogLoader = new CachedLoader<Calibre[]>();

  readonly all = this.calibres.asReadonly();

  load(): Observable<Calibre[]> {
    return this.fetchCalibres(true);
  }

  ensureLoaded(): Observable<Calibre[]> {
    if (this.loaded()) {
      return of(this.calibres());
    }
    return this.fetchCalibres();
  }

  getById(id: string): Calibre | undefined {
    return this.calibres().find((c) => c.id === id);
  }

  private fetchCalibres(force = false): Observable<Calibre[]> {
    return this.catalogLoader.load(
      () =>
        this.http
          .get<{ ok: boolean; calibres: ApiCalibre[] }>(`${environment.apiUrl}/calibre`)
          .pipe(
            map((res) => res.calibres.map((c) => ({ id: String(c.id), nombre: c.nombre }))),
            tap((items) => {
              this.calibres.set(items);
              this.loaded.set(true);
            }),
            catchError((error) => throwError(() => new Error(extractApiError(error)))),
          ),
      force,
    );
  }
}
