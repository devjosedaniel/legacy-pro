import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SriConfig } from '../models/sri-config.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class SriConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sri/config`;

  get(): Observable<SriConfig> {
    return this.http.get<{ ok: boolean; config: SriConfig }>(this.baseUrl).pipe(
      map((res) => res.config),
      catchError((err) => throwError(() => new Error(extractApiError(err)))),
    );
  }

  save(body: Partial<SriConfig>): Observable<{ mensaje: string; config: SriConfig }> {
    return this.http
      .put<{ ok: boolean; mensaje: string; config: SriConfig }>(this.baseUrl, body)
      .pipe(
        map((res) => ({ mensaje: res.mensaje, config: res.config })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  subirCertificado(archivo: File, password: string): Observable<{ mensaje: string; config: SriConfig }> {
    const data = new FormData();
    data.append('archivo', archivo);
    data.append('password', password);
    return this.http
      .post<{ ok: boolean; mensaje: string; config: SriConfig }>(`${this.baseUrl}/certificado`, data)
      .pipe(
        map((res) => ({ mensaje: res.mensaje, config: res.config })),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }
}
