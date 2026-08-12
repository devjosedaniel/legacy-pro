import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { extractApiError } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);

  downloadInventarioPdf(mes?: string): Observable<Blob> {
    let url = `${environment.apiUrl}/inv/reportes/inventario/pdf`;
    if (mes) {
      url += `?mes=${encodeURIComponent(mes)}`;
    }
    return this.fetchPdfBlob(url);
  }

  downloadIngresoKardexPdf(grupoId: string): Observable<Blob> {
    const url = `${environment.apiUrl}/inv/reportes/ingreso/${encodeURIComponent(grupoId)}/pdf`;
    return this.fetchPdfBlob(url);
  }

  saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private fetchPdfBlob(url: string): Observable<Blob> {
    return this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((res) => {
          const blob = res.body;
          if (!blob || blob.size === 0) {
            throw new Error('El PDF está vacío.');
          }
          const type = blob.type || res.headers.get('Content-Type') || '';
          if (type.includes('application/json')) {
            throw new Error('No se pudo generar el reporte.');
          }
          return blob;
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }
}
