import { Component, computed, inject, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-producto-detail',
  imports: [RouterLink, ReactiveFormsModule],
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

  protected readonly product = signal<Product | null>(null);
  protected readonly retazos = signal<Retazo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly retazoFilter = signal<RetazoEstado | 'all'>('disponible');
  protected readonly isSavingRetazo = signal(false);
  protected readonly retazoSuccess = signal<string | null>(null);

  protected readonly retazoForm = this.fb.nonNullable.group({
    ancho: [null as number | null, [Validators.required, Validators.min(0.01)]],
    alto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    notas: [''],
  });

  protected readonly stock = computed(() => {
    const p = this.product();
    return p ? this.movementService.getStock(p.id) : null;
  });

  protected readonly movements = computed((): Movement[] => {
    const p = this.product();
    return p ? this.movementService.getByProduct(p.id) : [];
  });

  protected readonly filteredRetazos = computed(() => {
    const filter = this.retazoFilter();
    const items = this.retazos();
    if (filter === 'all') return items;
    return items.filter((r) => r.estado === filter);
  });

  protected readonly retazosDisponiblesCount = computed(
    () => this.retazos().filter((r) => r.estado === 'disponible').length,
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadProduct(id);
  }

  protected getCategoryName(product: Product): string {
    return this.categoryService.getBySlug(product.categorySlug)?.name ?? product.categorySlug;
  }

  protected formatMedidas(ancho: number, alto: number): string {
    return `${ancho} × ${alto}`;
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
    this.reloadRetazos();
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
          this.reloadRetazos();
        },
        error: (err: Error) => {
          this.isSavingRetazo.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected updateRetazoEstado(retazo: Retazo, estado: RetazoEstado): void {
    this.retazoService.updateEstado(retazo.id, estado).subscribe({
      next: () => this.reloadRetazos(),
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  private loadProduct(id: string): void {
    this.isLoading.set(true);

    this.productService.fetchById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.movementService.refreshStock(id).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.reloadRetazos();
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

  private reloadRetazos(): void {
    const product = this.product();
    if (!product) return;

    const filter = this.retazoFilter();
    this.retazoService.listByProduct(product.id, filter).subscribe({
      next: (items) => this.retazos.set(items),
    });
  }
}
