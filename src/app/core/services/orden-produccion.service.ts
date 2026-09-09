import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiOrdenProduccion,
  OrdenProduccion,
  OrdenProduccionDetalle,
} from '../models/orden-produccion.model';
import { extractApiError } from '../utils/api.mappers';

function formatOpSecuencia(secuencia: string): string {
  const value = secuencia.trim();
  if (!value) return value;
  if (/^op/i.test(value)) return value.replace(/^op/i, 'OP');
  return `OP ${value}`;
}

function formatSisSecuencia(secuencia?: string): string | undefined {
  if (!secuencia?.trim()) return undefined;
  const value = secuencia.trim();
  if (/^sis/i.test(value)) return value.replace(/^sis/i, 'SIS');
  return `SIS ${value}`;
}

function mapOrdenProduccion(api: ApiOrdenProduccion): OrdenProduccion {
  return {
    id: api.id,
    secuencia: formatOpSecuencia(api.secuencia),
    detalle: api.detalle,
    calibreId: api.calibre_id,
    calibreNombre: api.calibre?.nombre ?? `Calibre ${api.calibre_id}`,
    clienteNombre: api.cliente?.nombres ?? '—',
    trabajoSecuencia: formatSisSecuencia(api.trabajo?.secuencia),
    estadoOrdenNombre: api.estadoorden,
    etapaNombre: api.etapa?.etapa?.nombre,
    urgencia: api.urgencia ?? 0,
    creadoPor: api.creado?.nombre ?? api.creado?.usuario,
    createdAt: api.created_at,
  };
}

function mapOrdenProduccionDetalle(api: ApiOrdenProduccion): OrdenProduccionDetalle {
  const base = mapOrdenProduccion(api);
  const lineas = (api.detalles ?? []).map((linea) => ({
    id: linea.id,
    productoNombre: linea.producto?.nombre ?? '—',
    color: linea.color,
    cantidad: linea.cantidad,
    ancho: linea.ancho,
    alto: linea.alto,
    lado: linea.lado,
    angulo: linea.angulo,
    porcentajeTinta: linea.porcentaje_tinta,
    coberturaTinta: linea.cobertura_tinta,
    lineatura: linea.lineatura,
    puntoMinimo: linea.puntominimo,
    digicap: linea.digicap,
  }));

  return {
    ...base,
    ciudad: api.ciudad,
    motivoNombre: api.motivo?.nombre,
    tipoImpresion: api.tipoimpresion,
    distorsion: api.distorsion,
    observacion: api.observacion,
    intelligentFlexo: api.ifx === true || api.ifx === 1,
    vps: api.trabajo?.vps,
    medida: api.medida,
    asunto: api.asunto,
    importante: api.importante,
    importanteProducto: api.importante_producto,
    coloresCount: lineas.length,
    fechaInicio: api.fechainicio,
    fechaProceso: api.fechaproceso,
    lineas,
    medidas: (api.medidas ?? []).map((medida) => ({
      id: medida.id,
      color: medida.color,
      ancho: Number(medida.ancho),
      alto: Number(medida.alto),
      cantidad: medida.cantidad,
    })),
    archivosCount: api.archivos?.length ?? 0,
  };
}

@Injectable({ providedIn: 'root' })
export class OrdenProduccionService {
  private readonly http = inject(HttpClient);

  listPlanificacion(): Observable<OrdenProduccion[]> {
    return this.http
      .get<{ ok: boolean; ordenes: ApiOrdenProduccion[] }>(
        `${environment.apiUrl}/produccion/estado/planificacion`,
      )
      .pipe(
        map((res) => (res.ordenes ?? []).map(mapOrdenProduccion)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }

  getById(id: number): Observable<OrdenProduccionDetalle> {
    return this.http
      .get<{ ok: boolean; orden: ApiOrdenProduccion }>(`${environment.apiUrl}/produccion/${id}`)
      .pipe(
        map((res) => mapOrdenProduccionDetalle(res.orden)),
        catchError((err) => throwError(() => new Error(extractApiError(err)))),
      );
  }
}
