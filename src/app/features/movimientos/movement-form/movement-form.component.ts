import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductCategorySlug } from '../../../core/models/category.model';
import {
  LoteStock,
  MOVEMENT_LABELS,
  MovementDirection,
  MovementFormData,
  MovementType,
  requiresProveedor,
  TIPOS_BAJADA,
  TIPOS_SUBIDA,
  loteKey,
} from '../../../core/models/movement.model';
import { Product } from '../../../core/models/product.model';
import { AuthService } from '../../../core/services/auth.service';
import { CalibreService } from '../../../core/services/calibre.service';
import { CategoryService } from '../../../core/services/category.service';
import { MarcaService } from '../../../core/services/marca.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-movement-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './movement-form.component.html',
  styleUrl: './movement-form.component.scss',
})
export class MovementFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly movementService = inject(MovementService);
  private readonly productService = inject(ProductService);
  private readonly calibreService = inject(CalibreService);
  private readonly marcaService = inject(MarcaService);
  private readonly categoryService = inject(CategoryService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly categories = this.categoryService.getActive();
  protected readonly movementLabels = MOVEMENT_LABELS;

  protected readonly direccion = signal<MovementDirection>('subida');
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly availableLotes = signal<LoteStock[]>([]);
  protected readonly loadingLotes = signal(false);
  protected readonly selectedProduct = signal<Product | null>(null);

  protected readonly isBajada = computed(() => this.direccion() === 'bajada');

  protected readonly showLotePicker = computed(
    () => this.isBajada() && !!this.form.controls.productId.value,
  );

  protected readonly selectedLote = computed(() => {
    const key = this.form.controls.loteKey.value;
    if (!key) return null;
    return this.availableLotes().find((l) => loteKey(l) === key) ?? null;
  });

  protected readonly productStock = computed(() => {
    const product = this.selectedProduct();
    if (!product) return null;
    return this.movementService.getStock(product.id);
  });

  protected readonly tiposDisponibles = computed(() =>
    this.direccion() === 'subida' ? TIPOS_SUBIDA : TIPOS_BAJADA,
  );

  protected readonly isPlanchas = computed(
    () => this.selectedProduct()?.categorySlug === 'planchas',
  );

  protected readonly showProveedor = computed(() => {
    const tipo = this.form.controls.tipo.value;
    return tipo ? requiresProveedor(tipo) : false;
  });

  protected readonly showFechaIngreso = computed(
    () => this.direccion() === 'subida' && this.isPlanchas(),
  );

  protected readonly showLoteSelect = computed(
    () => this.isBajada() && this.availableLotes().length > 0,
  );

  protected readonly showClienteTrabajo = computed(
    () => this.form.controls.tipo.value === 'salida_uso',
  );

  protected readonly showRetazoSection = computed(
    () =>
      this.isBajada() &&
      this.form.controls.tipo.value === 'salida_uso' &&
      this.selectedProduct()?.categorySlug === 'planchas',
  );

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['entrada_compra' as MovementType, Validators.required],
    categorySlug: ['planchas' as ProductCategorySlug, Validators.required],
    productId: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    numeroLote: ['', Validators.required],
    loteKey: [''],
    fechaIngreso: [new Date().toISOString().split('T')[0]],
    proveedor: [''],
    documentoRef: [''],
    motivo: [''],
    clienteTrabajo: [''],
    notas: [''],
    registrarRetazo: [false],
    retazoAncho: [null as number | null],
    retazoAlto: [null as number | null],
    retazoNotas: [''],
  });

  protected readonly categorySlug = signal<ProductCategorySlug>('planchas');
  protected readonly marcaFilter = signal('');
  protected readonly calibreFilter = signal('');

  protected readonly showPlanchaFilters = computed(() => this.categorySlug() === 'planchas');

  protected readonly marcasDisponibles = computed(() =>
    this.marcaService.getByCategory(this.categorySlug()),
  );

  protected readonly calibresDisponibles = this.calibreService.all;

  protected readonly filteredProducts = computed(() => {
    const marcaId = this.marcaFilter();
    const calibre = this.calibreFilter();

    return this.productService.all().filter((p) => {
      if (!p.activo || p.categorySlug !== this.categorySlug()) return false;
      if (marcaId && p.plancha?.marcaId !== marcaId) return false;
      if (calibre && p.plancha?.calibreId !== calibre) return false;
      return true;
    });
  });

  protected readonly filteredCount = computed(() => this.filteredProducts().length);

  ngOnInit(): void {
    this.marcaService.ensureLoaded('planchas').subscribe();
    this.calibreService.ensureLoaded().subscribe();
    this.categorySlug.set(this.form.controls.categorySlug.value as ProductCategorySlug);

    this.form.controls.categorySlug.valueChanges.subscribe((slug) => {
      this.categorySlug.set(slug as ProductCategorySlug);
      this.marcaService.ensureLoaded(slug as ProductCategorySlug).subscribe();
      this.clearProductFilters();
      this.form.controls.productId.reset('');
      this.selectedProduct.set(null);
      this.availableLotes.set([]);
    });
    this.form.controls.tipo.valueChanges.subscribe(() => this.onTipoChange());
    this.form.controls.registrarRetazo.valueChanges.subscribe(() => this.updateValidators());
    this.form.controls.productId.valueChanges.subscribe((id) => this.onProductChange(id));
    this.form.controls.loteKey.valueChanges.subscribe((key) => this.onLoteKeyChange(key));
    this.updateValidators();
  }

  protected setDireccion(dir: MovementDirection): void {
    this.direccion.set(dir);
    const tipos = dir === 'subida' ? TIPOS_SUBIDA : TIPOS_BAJADA;
    this.form.controls.tipo.setValue(tipos[0]);
    this.form.controls.loteKey.reset('');
    this.form.controls.numeroLote.reset('');
    this.availableLotes.set([]);
    this.updateValidators();
    this.errorMessage.set(null);

    const productId = this.form.controls.productId.value;
    if (productId && dir === 'bajada') {
      this.loadLotes(productId);
    }
  }

  protected onMarcaFilterChange(value: string): void {
    this.marcaFilter.set(value);
    this.calibreFilter.set('');
    this.syncProductSelection();
  }

  protected onCalibreFilterChange(value: string): void {
    this.calibreFilter.set(value);
    this.syncProductSelection();
  }

  protected clearProductFilters(): void {
    this.marcaFilter.set('');
    this.calibreFilter.set('');
    this.syncProductSelection();
  }

  protected getProductLabelShort(product: Product): string {
    if (product.plancha) {
      const m = product.plancha.medidas;
      return `${m.ancho} × ${m.alto}`;
    }
    return product.nombre;
  }

  protected getProductLabel(product: Product): string {
    if (product.plancha) {
      const m = product.plancha.medidas;
      return `${product.nombre} · ${product.plancha.marca} · ${product.plancha.calibre} · ${m.ancho}×${m.alto}`;
    }
    return product.nombre;
  }

  protected formatLoteOption(lote: LoteStock): string {
    const tipo = lote.stockTipo === 'propio' ? 'Propio' : `Consignación ${lote.proveedor}`;
    return `${lote.numeroLote} · ${tipo} · ${lote.cantidad} uds · ${lote.fechaIngreso}`;
  }

  protected getLoteKey(lote: LoteStock): string {
    return loteKey(lote);
  }

  protected formatStockTipo(tipo: LoteStock['stockTipo']): string {
    return tipo === 'propio' ? 'Propio' : 'Consignación';
  }

  protected onSubmit(): void {
    this.updateValidators();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.isBajada() && this.showLotePicker() && this.availableLotes().length > 0 && !this.selectedLote()) {
      this.errorMessage.set('Selecciona el lote que se dará de baja.');
      return;
    }

    const selectedLote = this.selectedLote();
    if (selectedLote && raw.cantidad > selectedLote.cantidad) {
      this.errorMessage.set(`La cantidad supera el stock del lote (${selectedLote.cantidad} uds).`);
      return;
    }

    const data: MovementFormData = {
      direccion: this.direccion(),
      tipo: raw.tipo,
      productId: raw.productId,
      cantidad: raw.cantidad,
      numeroLote: raw.numeroLote,
      loteId: selectedLote?.loteId,
      fechaIngreso: raw.fechaIngreso || undefined,
      proveedor: raw.proveedor || undefined,
      documentoRef: raw.documentoRef || undefined,
      motivo: raw.motivo || undefined,
      clienteTrabajo: raw.clienteTrabajo || undefined,
      notas: raw.notas || undefined,
    };

    if (raw.registrarRetazo && raw.retazoAncho && raw.retazoAlto) {
      data.retazoAncho = raw.retazoAncho;
      data.retazoAlto = raw.retazoAlto;
      data.retazoNotas = raw.retazoNotas || undefined;
    }

    const usuario = this.auth.user()?.name ?? 'Usuario';

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.movementService.registerMovement(data, usuario).subscribe({
      next: ({ movement, retazo }) => {
        this.isSaving.set(false);
        let msg = `Movimiento ${movement.numero} registrado correctamente.`;
        if (retazo) {
          msg += ` Retazo ${retazo.codigo} creado.`;
        }
        this.successMessage.set(msg);
        this.productService.refresh().subscribe();
        setTimeout(() => this.router.navigate(['/dashboard/movimientos']), 900);
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message ?? 'Error al registrar.');
      },
    });
  }

  private syncProductSelection(): void {
    const currentId = this.form.controls.productId.value;
    if (!currentId) return;

    const stillValid = this.filteredProducts().some((p) => p.id === currentId);
    if (!stillValid) {
      this.form.controls.productId.reset('');
      this.selectedProduct.set(null);
      this.availableLotes.set([]);
    }
  }

  private onTipoChange(): void {
    const productId = this.form.controls.productId.value;
    if (productId) {
      this.loadLotes(productId);
    }
    this.updateValidators();
  }

  private onProductChange(productId: string): void {
    if (!productId) {
      this.selectedProduct.set(null);
      this.availableLotes.set([]);
      return;
    }

    const product = this.productService.getById(productId);
    this.selectedProduct.set(product ?? null);

    if (product?.plancha && this.direccion() === 'subida' && !this.form.controls.proveedor.value) {
      const marca = product.plancha.marca;
      if (requiresProveedor(this.form.controls.tipo.value)) {
        this.form.controls.proveedor.setValue(marca);
      }
    }

    this.loadLotes(productId);
    this.updateValidators();
  }

  private onLoteKeyChange(key: string): void {
    if (this.direccion() !== 'bajada' || !key) return;

    const lote = this.availableLotes().find((l) => loteKey(l) === key);
    if (lote) {
      this.form.controls.numeroLote.setValue(lote.numeroLote, { emitEvent: false });
      if (lote.proveedor) {
        this.form.controls.proveedor.setValue(lote.proveedor);
      } else if (!requiresProveedor(this.form.controls.tipo.value)) {
        this.form.controls.proveedor.reset('');
      }
      this.updateValidators();
    }
  }

  private loadLotes(productId: string): void {
    if (this.direccion() !== 'bajada') {
      this.availableLotes.set([]);
      this.loadingLotes.set(false);
      return;
    }

    const tipo = this.form.controls.tipo.value;
    this.loadingLotes.set(true);
    this.form.controls.loteKey.reset('');
    this.form.controls.numeroLote.reset('');

    this.movementService.refreshStock(productId).subscribe({
      next: () => {
        this.movementService.fetchLotes(productId, tipo).subscribe({
          next: (lotes) => {
            this.availableLotes.set(lotes);
            this.loadingLotes.set(false);

            if (lotes.length === 1) {
              const l = lotes[0];
              this.form.controls.loteKey.setValue(loteKey(l));
              this.form.controls.numeroLote.setValue(l.numeroLote);
              if (l.proveedor) {
                this.form.controls.proveedor.setValue(l.proveedor);
              }
            }

            this.updateValidators();
          },
          error: () => {
            this.availableLotes.set([]);
            this.loadingLotes.set(false);
          },
        });
      },
      error: () => {
        this.availableLotes.set([]);
        this.loadingLotes.set(false);
      },
    });
  }

  private updateValidators(): void {
    const tipo = this.form.controls.tipo.value;
    const isSubida = this.direccion() === 'subida';
    const isBajada = this.direccion() === 'bajada';
    const isPlanchas = this.selectedProduct()?.categorySlug === 'planchas';
    const hasLotes = this.availableLotes().length > 0;

    const lote = this.form.controls.numeroLote;
    const loteKeyControl = this.form.controls.loteKey;
    const fecha = this.form.controls.fechaIngreso;
    const proveedor = this.form.controls.proveedor;
    const cantidad = this.form.controls.cantidad;

    if (isBajada && hasLotes) {
      loteKeyControl.setValidators([Validators.required]);
      lote.clearValidators();
    } else if (isSubida && isPlanchas) {
      lote.setValidators([Validators.required]);
      loteKeyControl.clearValidators();
    } else {
      lote.clearValidators();
      loteKeyControl.clearValidators();
    }

    const maxCantidad = this.selectedLote()?.cantidad;
    cantidad.setValidators([
      Validators.required,
      Validators.min(1),
      ...(maxCantidad ? [Validators.max(maxCantidad)] : []),
    ]);

    fecha.setValidators(isSubida && isPlanchas ? [Validators.required] : []);
    proveedor.setValidators(tipo && requiresProveedor(tipo) ? [Validators.required] : []);

    const retazoAncho = this.form.controls.retazoAncho;
    const retazoAlto = this.form.controls.retazoAlto;
    const registrarRetazo = this.showRetazoSection() && this.form.controls.registrarRetazo.value;

    if (registrarRetazo) {
      retazoAncho.setValidators([Validators.required, Validators.min(0.01)]);
      retazoAlto.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      retazoAncho.clearValidators();
      retazoAlto.clearValidators();
    }

    lote.updateValueAndValidity();
    loteKeyControl.updateValueAndValidity();
    fecha.updateValueAndValidity();
    proveedor.updateValueAndValidity();
    cantidad.updateValueAndValidity();
    retazoAncho.updateValueAndValidity();
    retazoAlto.updateValueAndValidity();
  }
}
