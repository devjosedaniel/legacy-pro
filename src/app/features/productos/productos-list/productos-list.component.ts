import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMedidasCm, formatStickybackMedidas } from '../../../core/utils/dimensions.util';
import { ProductCategorySlug } from '../../../core/models/category.model';
import { ProductStock } from '../../../core/models/movement.model';
import {
  categoriaEsRollo,
  Product,
  productoMarcaId,
  productoRollo,
} from '../../../core/models/product.model';
import { CalibreService } from '../../../core/services/calibre.service';
import { CategoryService } from '../../../core/services/category.service';
import { MarcaService } from '../../../core/services/marca.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-productos-list',
  imports: [RouterLink],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss',
})
export class ProductosListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly movementService = inject(MovementService);
  private readonly calibreService = inject(CalibreService);
  private readonly marcaService = inject(MarcaService);
  private readonly categoryService = inject(CategoryService);

  protected readonly successMessage = signal<string | null>(null);

  protected readonly categories = this.categoryService.getActive();

  protected readonly search = signal('');
  protected readonly categoryFilter = signal<ProductCategorySlug | 'all'>('all');
  protected readonly marcaFilter = signal('');
  protected readonly calibreFilter = signal('');
  protected readonly stockFilter = signal<'all' | 'propio' | 'consignacion' | 'cliente'>('all');

  protected readonly marcas = computed(() => {
    const cat = this.categoryFilter();
    if (cat === 'all' || cat === 'planchas') {
      return this.marcaService.getByCategory('planchas');
    }
    return this.marcaService.getByCategory(cat);
  });

  protected readonly calibres = computed(() => this.calibreService.all());

  protected readonly activeProducts = computed(() =>
    this.productService.all().filter((p) => p.activo),
  );

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    const category = this.categoryFilter();
    const marca = this.marcaFilter();
    const calibre = this.calibreFilter();
    const stockFilter = this.stockFilter();

    return this.activeProducts().filter((p) => {
      if (category !== 'all' && p.categorySlug !== category) return false;

      const stock = this.movementService.getStock(p.id);

      if (query) {
        const cat = this.categoryService.getBySlug(p.categorySlug);
        const haystack = [
          p.nombre,
          p.sku,
          cat?.name,
          p.plancha?.marca,
          p.stickyback?.marca,
          p.flexoback?.marca,
          p.plancha ? String(p.plancha.calibre) : '',
          this.formatMedidas(p),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      const marcaId = productoMarcaId(p);
      if (marca && marcaId !== marca) return false;

      if (p.plancha) {
        if (calibre && p.plancha.calibreId !== calibre) return false;
      }

      if (stockFilter === 'propio' && stock.propio === 0) return false;
      if (stockFilter === 'consignacion' && !this.hasConsignacion(stock)) return false;
      if (stockFilter === 'cliente' && stock.cliente <= 0) return false;
      return true;
    });
  });

  protected readonly totalCount = computed(() => {
    const category = this.categoryFilter();
    if (category === 'all') return this.activeProducts().length;
    return this.activeProducts().filter((p) => p.categorySlug === category).length;
  });

  protected readonly consignacionCount = computed(() => {
    return this.activeProducts().filter((p) => this.movementService.hasConsignacion(p.id)).length;
  });

  protected readonly clienteCount = computed(() => {
    return this.activeProducts().filter((p) => this.movementService.getStock(p.id).cliente > 0).length;
  });

  protected readonly showMarcaColumn = computed(() => {
    const cat = this.categoryFilter();
    return cat === 'all' || cat === 'planchas' || categoriaEsRollo(cat);
  });

  protected readonly showCalibreColumn = computed(() => {
    const cat = this.categoryFilter();
    return cat === 'all' || cat === 'planchas';
  });

  protected readonly showMedidasColumn = computed(() => this.showMarcaColumn());

  protected readonly selectedCategoryInfo = computed(() => {
    const cat = this.categoryFilter();
    if (cat === 'all') return null;
    return this.categoryService.getBySlug(cat);
  });

  ngOnInit(): void {
    const message = (history.state as { successMessage?: string } | null)?.successMessage;
    if (message) {
      this.successMessage.set(message);
      history.replaceState({ ...history.state, successMessage: undefined }, '');
      setTimeout(() => this.successMessage.set(null), 5000);
    }
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onCategoryChange(value: string): void {
    const category = value as ProductCategorySlug | 'all';
    this.categoryFilter.set(category);
    this.marcaFilter.set('');
    this.calibreFilter.set('');

    if (category !== 'all') {
      this.marcaService.ensureLoaded(category).subscribe();
    }
  }

  protected onMarcaChange(value: string): void {
    this.marcaFilter.set(value);
  }

  protected onCalibreChange(value: string): void {
    this.calibreFilter.set(value);
  }

  protected onStockFilterChange(value: string): void {
    this.stockFilter.set(value as 'all' | 'propio' | 'consignacion' | 'cliente');
  }

  protected clearFilters(): void {
    this.search.set('');
    this.categoryFilter.set('all');
    this.marcaFilter.set('');
    this.calibreFilter.set('');
    this.stockFilter.set('all');
  }

  protected getCategoryName(product: Product): string {
    return this.categoryService.getBySlug(product.categorySlug)?.name ?? product.categorySlug;
  }

  protected getCategoryIcon(product: Product): string {
    return this.categoryService.getBySlug(product.categorySlug)?.icon ?? '📦';
  }

  protected getStock(product: Product): ProductStock {
    return this.movementService.getStock(product.id);
  }

  protected formatMedidas(product: Product): string {
    if (product.plancha) {
      const m = product.plancha.medidas;
      return formatMedidasCm(m.ancho, m.alto);
    }
    const rollo = productoRollo(product);
    if (rollo) {
      return formatStickybackMedidas(rollo.medidas.ancho, rollo.medidas.largo);
    }
    return '—';
  }

  protected medidasLabel(product: Product): string {
    if (product.plancha) return 'Ancho × Alto · cm';
    if (productoRollo(product)) return 'Ancho × Largo';
    return '';
  }

  protected productMarca(product: Product): string {
    return product.plancha?.marca ?? productoRollo(product)?.marca ?? '—';
  }

  protected formatNumber(n: number): string {
    return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  protected stockBadge(product: Product): 'ok' | 'low' | 'zero' | 'consignacion' | 'cliente' {
    const stock = this.getStock(product);
    if (stock.propio === 0 && this.hasConsignacion(stock)) return 'consignacion';
    if (stock.propio === 0 && stock.cliente > 0) return 'cliente';
    if (stock.propio === 0) return 'zero';
    if (stock.propio <= product.stockMinimo) return 'low';
    return 'ok';
  }

  protected stockLabel(product: Product): string {
    const stock = this.getStock(product);
    const parts: string[] = [];

    if (stock.propio > 0) parts.push(`${stock.propio} propio`);

    const consignacionTotal = stock.consignacion.reduce((s, c) => s + c.cantidad, 0);
    if (consignacionTotal > 0) parts.push(`${consignacionTotal} consig.`);

    if (stock.cliente > 0) parts.push(`${stock.cliente} cliente`);
    return parts.length > 0 ? parts.join(' · ') : 'Sin stock';
  }

  protected consignacionDetail(product: Product): string {
    const stock = this.getStock(product);
    return stock.consignacion.map((c) => `${c.proveedor}: ${c.cantidad}`).join(', ');
  }

  protected hasConsignacion(stock: ProductStock): boolean {
    return stock.consignacion.some((c) => c.cantidad > 0);
  }
}
