import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, tap } from 'rxjs';
import { ProductCategorySlug } from '../models/category.model';
import { CalibreService } from './calibre.service';
import { CategoryService } from './category.service';
import { MarcaService } from './marca.service';
import { ProductService } from './product.service';

@Injectable({ providedIn: 'root' })
export class InventarioDataService {
  private readonly calibreService = inject(CalibreService);
  private readonly categoryService = inject(CategoryService);
  private readonly marcaService = inject(MarcaService);
  private readonly productService = inject(ProductService);
  private catalogReady = false;

  get isReady(): boolean {
    return this.catalogReady;
  }

  loadAll(): Observable<void> {
    this.catalogReady = false;
    return forkJoin([
      this.categoryService.load(),
      this.calibreService.load(),
      this.marcaService.loadByCategory('planchas'),
      this.productService.load(),
    ]).pipe(
      map(() => void 0),
      tap(() => {
        this.catalogReady = true;
      }),
    );
  }

  ensureLoaded(): Observable<void> {
    if (this.catalogReady) {
      return of(void 0);
    }

    return forkJoin([
      this.categoryService.ensureLoaded(),
      this.calibreService.ensureLoaded(),
      this.marcaService.ensureLoaded('planchas'),
      this.productService.ensureLoaded(),
    ]).pipe(
      map(() => void 0),
      tap(() => {
        this.catalogReady = true;
      }),
    );
  }

  ensureMarcasForCategory(slug: ProductCategorySlug): Observable<void> {
    return this.marcaService.ensureLoaded(slug).pipe(map(() => void 0));
  }
}
