import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Calibre } from '../models/calibre.model';
import { extractApiError } from '../utils/api.mappers';

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

  readonly all = this.calibres.asReadonly();

  load(): Observable<Calibre[]> {
    return this.http.get<{ ok: boolean; calibres: ApiCalibre[] }>(`${environment.apiUrl}/calibre`).pipe(
      map((res) => res.calibres.map((c) => ({ id: String(c.id), nombre: c.nombre }))),
      tap((items) => {
        this.calibres.set(items);
        this.loaded.set(true);
      }),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  ensureLoaded(): Observable<Calibre[]> {
    if (this.loaded()) {
      return of(this.calibres());
    }
    return this.load();
  }

  getById(id: string): Calibre | undefined {
    return this.calibres().find((c) => c.id === id);
  }
}
