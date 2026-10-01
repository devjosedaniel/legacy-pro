import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiProducto } from '../models/api.model';
import { ProductCategorySlug } from '../models/category.model';
import { ProductoFormData, Product } from '../models/product.model';
import { extractApiError, mapProducto } from '../utils/api.mappers';
import { CachedLoader } from '../utils/cached-load.util';
import { MovementService } from './movement.service';

const SUPPORTED_CATEGORIES: ProductCategorySlug[] = ['planchas', 'stickyback', 'flexoback'];

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly movementService = inject(MovementService);
  private readonly products = signal<Product[]>([]);
  private readonly loaded = signal(false);
  private readonly catalogLoader = new CachedLoader<Product[]>();

  readonly all = this.products.asReadonly();

  readonly planchas = computed(() =>
    this.products().filter((p) => p.categorySlug === 'planchas' && p.activo),
  );

  load(): Observable<Product[]> {
    return this.fetchProducts(true);
  }

  ensureLoaded(): Observable<Product[]> {
    if (this.loaded()) {
      return of(this.products());
    }
    return this.fetchProducts();
  }

  refresh(): Observable<Product[]> {
    return this.fetchProducts(true);
  }

  getById(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }

  fetchById(id: string): Observable<Product> {
    const cached = this.getById(id);
    if (cached) {
      return of(cached);
    }

    return this.http
      .get<{ ok: boolean; producto: ApiProducto }>(`${environment.apiUrl}/inv/productos/${id}`)
      .pipe(
        map((res) => mapProducto(res.producto)),
        tap((product) => {
          this.products.update((list) => {
            const exists = list.some((p) => p.id === product.id);
            return exists
              ? list.map((p) => (p.id === product.id ? product : p))
              : [...list, product];
          });
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  getByCategory(slug: string): Product[] {
    return this.products().filter((p) => p.categorySlug === slug && p.activo);
  }

  createProduct(data: ProductoFormData): Observable<Product> {
    if (!SUPPORTED_CATEGORIES.includes(data.categorySlug)) {
      return throwError(
        () => new Error('El formulario para esta categoría estará disponible próximamente.'),
      );
    }

    const body: Record<string, unknown> = {
      categoria_slug: data.categorySlug,
      nombre: data.nombre.trim().toUpperCase(),
      ancho: data.ancho,
      alto: data.alto,
      stock_minimo: data.stockMinimo,
      notas: data.notas,
    };

    if (data.categorySlug === 'planchas' && data.calibreId) {
      body['calibre_id'] = Number(data.calibreId);
    }

    if (data.marca) {
      body['marca'] = data.marca;
    } else if (data.marcaId) {
      body['marca_id'] = Number(data.marcaId);
    }

    return this.http
      .post<{ ok: boolean; producto: ApiProducto }>(`${environment.apiUrl}/inv/productos`, body)
      .pipe(
        map((res) => mapProducto(res.producto)),
        tap((product) => this.products.update((list) => [...list, product])),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  updateProduct(id: string, data: ProductoFormData): Observable<Product> {
    const body: Record<string, unknown> = {
      nombre: data.nombre.trim().toUpperCase(),
      ancho: data.ancho,
      alto: data.alto,
      stock_minimo: data.stockMinimo,
      notas: data.notas,
      activo: true,
    };

    if (data.categorySlug === 'planchas' && data.calibreId) {
      body['calibre_id'] = Number(data.calibreId);
    }

    if (data.marca) {
      body['marca'] = data.marca;
    } else if (data.marcaId) {
      body['marca_id'] = Number(data.marcaId);
    }

    return this.http
      .put<{ ok: boolean; producto: ApiProducto }>(`${environment.apiUrl}/inv/productos/${id}`, body)
      .pipe(
        map((res) => mapProducto(res.producto)),
        tap((product) =>
          this.products.update((list) => list.map((p) => (p.id === id ? product : p))),
        ),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<{ ok: boolean }>(`${environment.apiUrl}/inv/productos/${id}`).pipe(
      tap(() =>
        this.products.update((list) =>
          list.map((p) =>
            p.id === id ? { ...p, activo: false, updatedAt: new Date().toISOString() } : p,
          ),
        ),
      ),
      map(() => void 0),
      catchError((error) => throwError(() => new Error(extractApiError(error)))),
    );
  }

  getCalibres(categorySlug: ProductCategorySlug = 'planchas'): { id: string; nombre: string }[] {
    const map = new Map<string, string>();
    for (const p of this.products()) {
      if (p.activo && p.categorySlug === categorySlug && p.plancha) {
        map.set(p.plancha.calibreId, p.plancha.calibre);
      }
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  private fetchProducts(force = false): Observable<Product[]> {
    return this.catalogLoader.load(
      () => {
        const params = new HttpParams().set('con_stock', '1');

        return this.http
          .get<{ ok: boolean; productos: ApiProducto[] }>(`${environment.apiUrl}/inv/productos`, {
            params,
          })
          .pipe(
            tap((res) => this.movementService.syncStockFromApi(res.productos)),
            map((res) => res.productos.map(mapProducto)),
            tap((items) => {
              this.products.set(items);
              this.loaded.set(true);
            }),
            catchError((error) => throwError(() => new Error(extractApiError(error)))),
          );
      },
      force,
    );
  }
}
