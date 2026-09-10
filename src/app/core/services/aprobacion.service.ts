import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AprobacionAccionResponse,
  AprobacionDetalleResponse,
} from '../models/aprobacion.model';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class AprobacionService {
  private readonly http = inject(HttpClient);
  private readonly aprobacionUrl = `${environment.apiUrl}/aprobacion`;
  private readonly archivoUrl = `${environment.apiUrl}/archivo`;

  mostrar(token: string): Observable<AprobacionDetalleResponse> {
    return this.http
      .get<AprobacionDetalleResponse>(`${environment.apiUrl}/pwa/aprobacion/${encodeURIComponent(token)}`)
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  descargarSeguro(token: string): Observable<Blob> {
    return this.http
      .get(`${environment.apiUrl}/pwa/archivo/${encodeURIComponent(token)}/download-secure`, {
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
          if (blob.type.includes('application/json')) {
            throw new Error('No se pudo descargar el archivo.');
          }
          return blob;
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  aprobarDigital(archivoId: number): Observable<AprobacionAccionResponse> {
    return this.http
      .get<AprobacionAccionResponse>(`${this.archivoUrl}/${archivoId}/aprobar-digital`)
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  aprobarDigitalConArchivo(archivoId: number, file: File): Observable<AprobacionAccionResponse> {
    const formData = new FormData();
    formData.append('file0', file);
    return this.http
      .post<AprobacionAccionResponse>(`${this.archivoUrl}/${archivoId}/aprobar-digital`, formData)
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  registrarCambios(archivoId: number, sugerencia: string, file?: File | null): Observable<AprobacionAccionResponse> {
    const formData = new FormData();
    formData.append('sugerencia', sugerencia);
    if (file) {
      formData.append('file', file);
    }
    return this.http
      .post<AprobacionAccionResponse>(`${this.archivoUrl}/${archivoId}/cambios`, formData)
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  solicitarCotizacion(trabajoId: number, observacion: string): Observable<AprobacionAccionResponse> {
    return this.http
      .post<AprobacionAccionResponse>(`${this.aprobacionUrl}/${trabajoId}/solicitud/cotizacion`, {
        observacion,
      })
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  solicitarPruebaColor(archivoId: number, colaId: number): Observable<AprobacionAccionResponse> {
    return this.http
      .post<AprobacionAccionResponse>(`${this.aprobacionUrl}/${archivoId}/solicitud/prueba-color`, {
        cola_id: colaId,
      })
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }

  solicitarFotopolimero(
    archivoId: number,
    data: {
      informacion: string;
      colores: Array<{ id: number; procesar: number; digicap: string | null }>;
      files: File[];
    },
  ): Observable<AprobacionAccionResponse> {
    const formData = new FormData();
    formData.append('informacion', data.informacion);
    formData.append('colores', JSON.stringify(data.colores));
    formData.append('num_files', String(data.files.length));
    data.files.forEach((file, index) => formData.append(`file${index}`, file));
    return this.http
      .post<AprobacionAccionResponse>(
        `${this.aprobacionUrl}/${archivoId}/solicitud/fotopolimero`,
        formData,
      )
      .pipe(catchError((error) => throwError(() => new Error(extractApiError(error)))));
  }
}
