import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ProductCategorySlug } from '../models/category.model';
import { CalibreService } from './calibre.service';
import { CategoryService } from './category.service';
import { MarcaService } from './marca.service';
import { MovementService } from './movement.service';
import { ProductService } from './product.service';

@Injectable({ providedIn: 'root' })
export class InventarioDataService {
  private readonly calibreService = inject(CalibreService);
  private readonly categoryService = inject(CategoryService);
  private readonly marcaService = inject(MarcaService);
  private readonly productService = inject(ProductService);
  private readonly movementService = inject(MovementService);

  loadAll(): Observable<void> {
    return forkJoin([
      this.categoryService.load(),
      this.calibreService.load(),
      this.marcaService.loadByCategory('planchas'),
      this.productService.load(),
      this.movementService.load(),
    ]).pipe(map(() => void 0));
  }

  ensureLoaded(): Observable<void> {
    return forkJoin([
      this.categoryService.ensureLoaded(),
      this.calibreService.ensureLoaded(),
      this.marcaService.ensureLoaded('planchas'),
      this.productService.ensureLoaded(),
      this.movementService.ensureLoaded(),
    ]).pipe(map(() => void 0));
  }

  ensureMarcasForCategory(slug: ProductCategorySlug): Observable<void> {
    return this.marcaService.ensureLoaded(slug).pipe(map(() => void 0));
  }
}
