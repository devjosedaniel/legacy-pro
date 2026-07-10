import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiCategoria } from '../models/api.model';
import { Category } from '../models/category.model';
import { extractApiError, mapCategoria } from '../utils/api.mappers';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly categories = signal<Category[]>([]);
  private readonly loaded = signal(false);

  readonly all = this.categories.asReadonly();

  load(): Observable<Category[]> {
    return this.http
      .get<{ ok: boolean; categorias: ApiCategoria[] }>(`${environment.apiUrl}/inv/categorias`)
      .pipe(
        map((res) => res.categorias.map(mapCategoria)),
        tap((items) => {
          this.categories.set(items);
          this.loaded.set(true);
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  ensureLoaded(): Observable<Category[]> {
    if (this.loaded()) {
      return new Observable((subscriber) => {
        subscriber.next(this.categories());
        subscriber.complete();
      });
    }
    return this.load();
  }

  getBySlug(slug: string): Category | undefined {
    return this.categories().find((c) => c.slug === slug);
  }

  getById(id: string): Category | undefined {
    return this.categories().find((c) => c.id === id);
  }

  getActive(): Category[] {
    return this.categories().filter((c) => c.active);
  }
}
