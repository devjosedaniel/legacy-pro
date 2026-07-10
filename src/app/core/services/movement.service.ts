import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiLoteStock, ApiMovimiento, ApiProducto, ApiRetazo, ApiStock } from '../models/api.model';
import {
  LoteStock,
  Movement,
  MovementFormData,
  MovementType,
  ProductStock,
} from '../models/movement.model';
import { Retazo } from '../models/retazo.model';
import { extractApiError, mapLote, mapMovimiento, mapRetazo, mapStock } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly http = inject(HttpClient);
  private readonly movements = signal<Movement[]>([]);
  private readonly stockMap = signal<Record<string, ProductStock>>({});
  private readonly loaded = signal(false);

  readonly all = this.movements.asReadonly();
  readonly stockByProduct = this.stockMap.asReadonly();

  load(): Observable<Movement[]> {
    const params = new HttpParams().set('limite', '200');
    return this.http
      .get<{ ok: boolean; movimientos: ApiMovimiento[] }>(`${environment.apiUrl}/inv/movimientos`, {
        params,
      })
      .pipe(
        map((res) => res.movimientos.map(mapMovimiento)),
        tap((items) => {
          this.movements.set(items);
          this.loaded.set(true);
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  ensureLoaded(): Observable<Movement[]> {
    if (this.loaded()) {
      return of(this.movements());
    }
    return this.load();
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
        tap(({ movement }) => this.movements.update((list) => [movement, ...list])),
        tap(({ movement }) => {
          this.refreshStock(movement.productId).subscribe();
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  getByProduct(productId: string): Movement[] {
    return this.movements()
      .filter((m) => m.productId === productId)
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  }

  getRecent(limit = 50): Movement[] {
    return [...this.movements()]
      .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro))
      .slice(0, limit);
  }
}
