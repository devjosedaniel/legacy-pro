import { KeyValuePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-movimientos-list',
  imports: [RouterLink, KeyValuePipe],
  templateUrl: './movimientos-list.component.html',
  styleUrl: './movimientos-list.component.scss',
})
export class MovimientosListComponent {
  private readonly movementService = inject(MovementService);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);

  protected readonly movementLabels = MOVEMENT_LABELS;
  protected readonly categories = this.categoryService.getActive();

  protected readonly search = signal('');
  protected readonly direccionFilter = signal<MovementDirection | 'all'>('all');
  protected readonly tipoFilter = signal<MovementType | 'all'>('all');
  protected readonly categoryFilter = signal<ProductCategorySlug | 'all'>('all');

  protected readonly allMovements = computed(() => this.movementService.getRecent(200));

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    const dir = this.direccionFilter();
    const tipo = this.tipoFilter();
    const cat = this.categoryFilter();

    return this.allMovements().filter((m) => {
      if (dir !== 'all' && m.direccion !== dir) return false;
      if (tipo !== 'all' && m.tipo !== tipo) return false;
      if (cat !== 'all' && m.categorySlug !== cat) return false;

      if (query) {
        const product = this.productService.getById(m.productId);
        const haystack = [
          m.numero,
          m.numeroLote,
          product?.nombre,
          product?.sku,
          m.proveedor,
          m.usuario,
          m.documentoRef,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  });

  protected readonly subidasCount = computed(
    () => this.allMovements().filter((m) => m.direccion === 'subida').length,
  );

  protected readonly bajadasCount = computed(
    () => this.allMovements().filter((m) => m.direccion === 'bajada').length,
  );

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
  }
}
