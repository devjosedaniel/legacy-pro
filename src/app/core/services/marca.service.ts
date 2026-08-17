import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductCategorySlug } from '../models/category.model';
import { Marca } from '../models/marca.model';
import { extractApiError } from '../utils/api.mappers';
import { CachedLoaderMap } from '../utils/cached-load.util';

interface ApiMarca {
  id: number;
  categoria_id: number;
  nombre: string;
  activo: boolean;
  categoria?: { id: number; slug: ProductCategorySlug };
}

@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly http = inject(HttpClient);
  private readonly byCategory = signal<Partial<Record<ProductCategorySlug, Marca[]>>>({});
  private readonly loadedCategories = signal<Set<ProductCategorySlug>>(new Set());
  private readonly catalogLoader = new CachedLoaderMap<ProductCategorySlug, Marca[]>();

  loadByCategory(slug: ProductCategorySlug): Observable<Marca[]> {
    return this.fetchByCategory(slug, true);
  }

  ensureLoaded(slug: ProductCategorySlug): Observable<Marca[]> {
    if (this.loadedCategories().has(slug)) {
      return of(this.getByCategory(slug));
    }
    return this.fetchByCategory(slug);
  }

  getByCategory(slug: ProductCategorySlug): Marca[] {
    return this.byCategory()[slug] ?? [];
  }

  getById(id: string, slug?: ProductCategorySlug): Marca | undefined {
    if (slug) {
      return this.getByCategory(slug).find((m) => m.id === id);
    }

    for (const items of Object.values(this.byCategory())) {
      const found = items?.find((m) => m.id === id);
      if (found) return found;
    }

    return undefined;
  }

  refreshByCategory(slug: ProductCategorySlug): Observable<Marca[]> {
    this.loadedCategories.update((set) => {
      const next = new Set(set);
      next.delete(slug);
      return next;
    });
    this.catalogLoader.invalidate(slug);

    return this.fetchByCategory(slug, true);
  }

  private fetchByCategory(slug: ProductCategorySlug, force = false): Observable<Marca[]> {
    return this.catalogLoader.load(
      slug,
      () => {
        const params = new HttpParams().set('categoria_slug', slug);

        return this.http
          .get<{ ok: boolean; marcas: ApiMarca[] }>(`${environment.apiUrl}/inv/marcas`, { params })
          .pipe(
            map((res) => res.marcas.map((m) => this.mapMarca(m, slug))),
            tap((items) => {
              this.byCategory.update((current) => ({ ...current, [slug]: items }));
              this.loadedCategories.update((set) => new Set([...set, slug]));
            }),
            catchError((error) => throwError(() => new Error(extractApiError(error)))),
          );
      },
      force,
    );
  }

  private mapMarca(api: ApiMarca, fallbackSlug?: ProductCategorySlug): Marca {
    return {
      id: String(api.id),
      nombre: api.nombre,
      categoriaId: String(api.categoria_id),
      categoriaSlug: api.categoria?.slug ?? fallbackSlug,
      activo: api.activo,
    };
  }
}
