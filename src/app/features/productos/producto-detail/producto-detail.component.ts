import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MOVEMENT_LABELS, Movement } from '../../../core/models/movement.model';
import { Product } from '../../../core/models/product.model';
import {
  RETAZO_ESTADO_LABELS,
  RETAZO_ORIGEN_LABELS,
  Retazo,
  RetazoEstado,
} from '../../../core/models/retazo.model';
import { CategoryService } from '../../../core/services/category.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';
import { RetazoService } from '../../../core/services/retazo.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { formatMedidasCm } from '../../../core/utils/dimensions.util';
import { formatMovimientoStockOrigen } from '../../../core/utils/stock-tipo.util';
import { ConsumoConsignacionResumen } from '../../../core/services/movement.service';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-producto-detail',
  imports: [RouterLink, ReactiveFormsModule, PaginationComponent],
  templateUrl: './producto-detail.component.html',
  styleUrl: './producto-detail.component.scss',
})
export class ProductoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly movementService = inject(MovementService);
  private readonly retazoService = inject(RetazoService);
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);

  protected readonly movementLabels = MOVEMENT_LABELS;
  protected readonly retazoEstadoLabels = RETAZO_ESTADO_LABELS;
  protected readonly retazoOrigenLabels = RETAZO_ORIGEN_LABELS;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly product = signal<Product | null>(null);
  protected readonly retazos = signal<Retazo[]>([]);
  protected readonly movements = signal<Movement[]>([]);
  protected readonly retazosTotal = signal(0);
  protected readonly movementsTotal = signal(0);
  protected readonly retazosPage = signal(1);
  protected readonly movementsPage = signal(1);
  protected readonly retazosDisponiblesCount = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly loadingMovements = signal(false);
  protected readonly loadingRetazos = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly retazoFilter = signal<RetazoEstado | 'all'>('disponible');
  protected readonly isSavingRetazo = signal(false);
  protected readonly retazoSuccess = signal<string | null>(null);
  protected readonly consumoConsignacion = signal<ConsumoConsignacionResumen | null>(null);
  protected readonly formatStockOrigen = formatMovimientoStockOrigen;

  protected readonly retazoForm = this.fb.nonNullable.group({
    ancho: [null as number | null, [Validators.required, Validators.min(0.01)]],
    alto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    notas: [''],
  });

  protected readonly stock = signal<ReturnType<MovementService['getStock']> | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadProduct(id);
  }

  protected getCategoryName(product: Product): string {
    return this.categoryService.getBySlug(product.categorySlug)?.name ?? product.categorySlug;
  }

  protected formatMedidas(ancho: number, alto: number): string {
    return formatMedidasCm(ancho, alto);
  }

  protected consignacionTotal(): number {
    const s = this.stock();
    if (!s) return 0;
    return s.consignacion.reduce((sum, item) => sum + item.cantidad, 0);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected onRetazoFilterChange(value: string): void {
    this.retazoFilter.set(value as RetazoEstado | 'all');
    this.loadRetazos(1);
  }

  protected onRetazosPageChange(page: number): void {
    this.loadRetazos(page);
  }

  protected onMovementsPageChange(page: number): void {
    this.loadMovements(page);
  }

  protected submitRetazo(): void {
    const product = this.product();
    if (!product || this.retazoForm.invalid) {
      this.retazoForm.markAllAsTouched();
      return;
    }

    const raw = this.retazoForm.getRawValue();
    this.isSavingRetazo.set(true);
    this.retazoSuccess.set(null);
    this.errorMessage.set(null);

    this.retazoService
      .create({
        productId: product.id,
        ancho: raw.ancho!,
        alto: raw.alto!,
        notas: raw.notas || undefined,
      })
      .subscribe({
        next: (retazo) => {
          this.isSavingRetazo.set(false);
          this.retazoSuccess.set(`Retazo ${retazo.codigo} registrado.`);
          this.retazoForm.reset({ ancho: null, alto: null, notas: '' });
          this.loadRetazos(1);
          this.loadRetazosDisponiblesCount();
        },
        error: (err: Error) => {
          this.isSavingRetazo.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected updateRetazoEstado(retazo: Retazo, estado: RetazoEstado): void {
    this.retazoService.updateEstado(retazo.id, estado).subscribe({
      next: () => {
        this.loadRetazos(this.retazosPage());
        this.loadRetazosDisponiblesCount();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  private loadProduct(id: string): void {
    this.isLoading.set(true);

    this.productService.fetchById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.movementService.refreshStock(id).subscribe({
          next: (stock) => {
            this.stock.set(stock);
            this.isLoading.set(false);
            this.loadMovements(1);
            this.loadRetazos(1);
            this.loadRetazosDisponiblesCount();
            this.loadConsumoConsignacion(id);
          },
          error: () => this.isLoading.set(false),
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Producto no encontrado.');
      },
    });
  }

  private loadMovements(page: number): void {
    const product = this.product();
    if (!product) return;

    this.loadingMovements.set(true);
    this.movementService
      .fetchPage({ productId: product.id, page, pageSize: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          this.movements.set(res.items);
          this.movementsTotal.set(res.total);
          this.movementsPage.set(res.page);
          this.loadingMovements.set(false);
        },
        error: () => this.loadingMovements.set(false),
      });
  }

  private loadRetazos(page: number): void {
    const product = this.product();
    if (!product) return;

    this.loadingRetazos.set(true);
    this.retazoService
      .fetchPage({
        productId: product.id,
        estado: this.retazoFilter(),
        page,
        pageSize: PAGE_SIZE,
      })
      .subscribe({
        next: (res) => {
          this.retazos.set(res.items);
          this.retazosTotal.set(res.total);
          this.retazosPage.set(res.page);
          this.loadingRetazos.set(false);
        },
        error: () => this.loadingRetazos.set(false),
      });
  }

  private loadRetazosDisponiblesCount(): void {
    const product = this.product();
    if (!product) return;

    this.retazoService
      .fetchPage({ productId: product.id, estado: 'disponible', page: 1, pageSize: 1 })
      .subscribe({
        next: (res) => this.retazosDisponiblesCount.set(res.total),
      });
  }

  private loadConsumoConsignacion(productId: string): void {
    this.movementService.fetchConsumoConsignacion({ productId }).subscribe({
      next: (res) => this.consumoConsignacion.set(res),
      error: () => this.consumoConsignacion.set(null),
    });
  }
}
