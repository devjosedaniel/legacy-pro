import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiLoteStock, ApiMovimiento, ApiProducto, ApiRetazo, ApiStock } from '../models/api.model';
import {
  LoteStock,
  Movement,
  MovementFormData,
  MovementType,
  ProductStock,
} from '../models/movement.model';
import { PaginatedResult } from '../models/pagination.model';
import { ProductCategorySlug } from '../models/category.model';
import { Retazo } from '../models/retazo.model';
import { extractApiError, mapLote, mapMovimiento, mapRetazo, mapStock } from '../utils/api.mappers';

export interface MovementPageFilters {
  page?: number;
  pageSize?: number;
  productId?: string;
  direccion?: 'subida' | 'bajada';
  tipo?: MovementType;
  categorySlug?: ProductCategorySlug;
  q?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly http = inject(HttpClient);
  private readonly stockMap = signal<Record<string, ProductStock>>({});

  readonly stockByProduct = this.stockMap.asReadonly();

  fetchPage(filters: MovementPageFilters = {}): Observable<PaginatedResult<Movement>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;

    let params = new HttpParams()
      .set('pagina', String(page))
      .set('limite', String(pageSize));

    if (filters.productId) {
      params = params.set('producto_id', filters.productId);
    }
    if (filters.direccion) {
      params = params.set('direccion', filters.direccion);
    }
    if (filters.tipo) {
      params = params.set('tipo', filters.tipo);
    }
    if (filters.categorySlug) {
      params = params.set('categoria_slug', filters.categorySlug);
    }
    if (filters.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }
    if (filters.fechaDesde) {
      params = params.set('fecha_desde', filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      params = params.set('fecha_hasta', filters.fechaHasta);
    }

    return this.http
      .get<{
        ok: boolean;
        movimientos: ApiMovimiento[];
        cantidad: number;
        pagina: number;
        limite: number;
      }>(`${environment.apiUrl}/inv/movimientos`, { params })
      .pipe(
        map((res) => ({
          items: res.movimientos.map(mapMovimiento),
          total: res.cantidad,
          page: res.pagina,
          pageSize: res.limite,
        })),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  count(filters: Omit<MovementPageFilters, 'page' | 'pageSize'> = {}): Observable<number> {
    return this.fetchPage({ ...filters, page: 1, pageSize: 1 }).pipe(map((res) => res.total));
  }

  syncStockFromApi(productos: ApiProducto[]): void {
    const map: Record<string, ProductStock> = {};
    for (const producto of productos) {
      if (producto.stock) {
        map[String(producto.id)] = mapStock(producto.stock);
      }
    }
    this.stockMap.set(map);
  }

  refreshStock(productId: string): Observable<ProductStock> {
    return this.http
      .get<{ ok: boolean; stock: ApiStock }>(`${environment.apiUrl}/inv/stock/${productId}`)
      .pipe(
        map((res) => mapStock(res.stock)),
        tap((stock) => this.stockMap.update((current) => ({ ...current, [productId]: stock }))),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  fetchLotes(productId: string, tipo?: MovementType): Observable<LoteStock[]> {
    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipo', tipo);
    }

    return this.http
      .get<{ ok: boolean; lotes: ApiLoteStock[] }>(
        `${environment.apiUrl}/inv/stock/${productId}/lotes`,
        { params },
      )
      .pipe(
        map((res) => res.lotes.map(mapLote)),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  getStock(productId: string): ProductStock {
    return (
      this.stockMap()[productId] ?? {
        productId,
        propio: 0,
        consignacion: [],
        total: 0,
        lotes: [],
      }
    );
  }

  getLotesByProduct(productId: string): LoteStock[] {
    return this.getStock(productId).lotes.filter((l) => l.cantidad > 0);
  }

  getConsignacionTotal(productId: string): number {
    return this.getStock(productId).consignacion.reduce((sum, c) => sum + c.cantidad, 0);
  }

  hasConsignacion(productId: string): boolean {
    return this.getConsignacionTotal(productId) > 0;
  }

  getAvailableLotes(productId: string, tipo?: MovementType): LoteStock[] {
    const lotes = this.getLotesByProduct(productId);
    if (!tipo) return lotes;

    if (tipo === 'compra_consignacion' || tipo === 'devolucion_consignacion') {
      return lotes.filter((l) => l.stockTipo === 'consignacion');
    }

    return lotes;
  }

  registerMovement(
    data: MovementFormData,
    _usuario: string,
  ): Observable<{ movement: Movement; retazo?: Retazo }> {
    const body: Record<string, unknown> = {
      producto_id: Number(data.productId),
      tipo: data.tipo,
      cantidad: data.cantidad,
      numero_lote: data.numeroLote.trim().toUpperCase(),
      fecha_ingreso: data.fechaIngreso,
      fecha_expiracion: data.fechaExpiracion,
      proveedor_id: data.proveedorId ? Number(data.proveedorId) : undefined,
      proveedor: data.proveedor,
      documento_ref: data.documentoRef,
      motivo: data.motivo,
      cliente_trabajo: data.clienteTrabajo,
      notas: data.notas,
    };

    if (data.loteId) {
      body['lote_id'] = data.loteId;
    }

    if (data.retazoAncho && data.retazoAlto) {
      body['retazo_ancho'] = data.retazoAncho;
      body['retazo_alto'] = data.retazoAlto;
      body['retazo_notas'] = data.retazoNotas;
    }

    return this.http
      .post<{ ok: boolean; movimiento: ApiMovimiento; retazo?: ApiRetazo }>(
        `${environment.apiUrl}/inv/movimientos`,
        body,
      )
      .pipe(
        map((res) => ({
          movement: mapMovimiento(res.movimiento),
          retazo: res.retazo ? mapRetazo(res.retazo) : undefined,
        })),
        tap(({ movement }) => {
          this.refreshStock(movement.productId).subscribe();
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }
}
