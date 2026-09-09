import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RetazosDisponiblesReporte } from '../models/reporte.model';
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

  fetchRetazosDisponibles(): Observable<RetazosDisponiblesReporte> {
    return this.http
      .get<{
        ok: boolean;
        generado_por: string;
        generado_el: string;
        total_retazos: number;
        grupos: Array<{
          calibre_id: number;
          calibre_nombre: string;
          cantidad: number;
          area_total_cm2: number;
          productos: Array<{
            producto_id: number;
            producto_nombre: string;
            producto_sku: string;
            cantidad: number;
            area_total_cm2: number;
            retazos: Array<{
              id: number;
              codigo: string;
              ancho: number;
              alto: number;
              medidas: string;
              area_cm2: number;
              origen: string;
              origen_label: string;
            }>;
          }>;
        }>;
      }>(`${environment.apiUrl}/inv/reportes/retazos/disponibles`)
      .pipe(
        map((res) => ({
          generadoPor: res.generado_por,
          generadoEl: res.generado_el,
          totalRetazos: res.total_retazos,
          grupos: res.grupos.map((grupo) => ({
            calibreId: grupo.calibre_id,
            calibreNombre: grupo.calibre_nombre,
            cantidad: grupo.cantidad,
            areaTotalCm2: grupo.area_total_cm2,
            productos: grupo.productos.map((producto) => ({
              productoId: producto.producto_id,
              productoNombre: producto.producto_nombre,
              productoSku: producto.producto_sku,
              cantidad: producto.cantidad,
              areaTotalCm2: producto.area_total_cm2,
              retazos: producto.retazos.map((retazo) => ({
                id: retazo.id,
                codigo: retazo.codigo,
                ancho: retazo.ancho,
                alto: retazo.alto,
                medidas: retazo.medidas,
                areaCm2: retazo.area_cm2,
                origen: retazo.origen,
                origenLabel: retazo.origen_label,
              })),
            })),
          })),
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  downloadRetazosDisponiblesPdf(): Observable<Blob> {
    return this.fetchPdfBlob(`${environment.apiUrl}/inv/reportes/retazos/disponibles/pdf`);
  }

  downloadConsumoDesperdicioPdf(mes: string): Observable<Blob> {
    const params = new URLSearchParams({ mes });
    return this.fetchPdfBlob(
      `${environment.apiUrl}/produccion/reportes/consumo-desperdicio/pdf?${params.toString()}`,
    );
  }

  downloadMaterialUsadoPdf(mes: string): Observable<Blob> {
    const params = new URLSearchParams({ mes });
    return this.fetchPdfBlob(
      `${environment.apiUrl}/inv/reportes/material-usado/pdf?${params.toString()}`,
    );
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
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
            return from(error.error.text()).pipe(
              switchMap((text) => {
                try {
                  const body = JSON.parse(text) as { mensaje?: string };
                  return throwError(() => new Error(body.mensaje || 'No se pudo generar el reporte.'));
                } catch {
                  return throwError(() => new Error(extractApiError(error)));
                }
              }),
            );
          }
          return throwError(() => new Error(extractApiError(error)));
        }),
      );
  }
}
