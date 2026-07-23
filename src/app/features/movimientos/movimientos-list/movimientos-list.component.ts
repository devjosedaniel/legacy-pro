import { KeyValuePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { ProductCategorySlug } from '../../../core/models/category.model';
import {
  MOVEMENT_LABELS,
  Movement,
  MovementDirection,
  MovementType,
} from '../../../core/models/movement.model';
import { CategoryService } from '../../../core/services/category.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-movimientos-list',
  imports: [RouterLink, KeyValuePipe, PaginationComponent],
  templateUrl: './movimientos-list.component.html',
  styleUrl: './movimientos-list.component.scss',
})
export class MovimientosListComponent implements OnInit {
  private readonly movementService = inject(MovementService);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();

  protected readonly movementLabels = MOVEMENT_LABELS;
  protected readonly categories = this.categoryService.getActive();
  protected readonly pageSize = PAGE_SIZE;

  protected readonly search = signal('');
  protected readonly direccionFilter = signal<MovementDirection | 'all'>('all');
  protected readonly tipoFilter = signal<MovementType | 'all'>('all');
  protected readonly categoryFilter = signal<ProductCategorySlug | 'all'>('all');

  protected readonly movements = signal<Movement[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly totalSubidas = signal(0);
  protected readonly totalBajadas = signal(0);

  ngOnInit(): void {
    this.reload$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPage(this.page()));

    this.loadSummaryCounts();
    this.reload$.next();
  }

  protected onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.reload$.next();
  }

  protected onDireccionChange(value: string): void {
    this.direccionFilter.set(value as MovementDirection | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected onTipoChange(value: string): void {
    this.tipoFilter.set(value as MovementType | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected onCategoryChange(value: string): void {
    this.categoryFilter.set(value as ProductCategorySlug | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected onPageChange(next: number): void {
    this.loadPage(next);
  }

  protected getProductName(movement: Movement): string {
    return this.productService.getById(movement.productId)?.nombre ?? '—';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.direccionFilter.set('all');
    this.tipoFilter.set('all');
    this.categoryFilter.set('all');
    this.page.set(1);
    this.reload$.next();
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const dir = this.direccionFilter();
    const tipo = this.tipoFilter();
    const cat = this.categoryFilter();

    this.movementService
      .fetchPage({
        page,
        pageSize: PAGE_SIZE,
        q: this.search() || undefined,
        direccion: dir === 'all' ? undefined : dir,
        tipo: tipo === 'all' ? undefined : tipo,
        categorySlug: cat === 'all' ? undefined : cat,
      })
      .subscribe({
        next: (res) => {
          this.movements.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.loadError.set(err.message);
        },
      });
  }

  private loadSummaryCounts(): void {
    this.movementService.count({ direccion: 'subida' }).subscribe({
      next: (n) => this.totalSubidas.set(n),
    });
    this.movementService.count({ direccion: 'bajada' }).subscribe({
      next: (n) => this.totalBajadas.set(n),
    });
  }
}
