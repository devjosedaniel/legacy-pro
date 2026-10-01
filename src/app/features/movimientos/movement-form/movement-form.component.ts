import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, switchMap, catchError, of, finalize, distinctUntilChanged } from 'rxjs';
import { ProductCategorySlug } from '../../../core/models/category.model';
import {
  BatchMovementFormData,
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
import {
  Product,
  categoriaEsRollo,
  categoriaUsaLote,
  productoMarcaId,
  productoRollo,
} from '../../../core/models/product.model';
import { InventarioDataService } from '../../../core/services/inventario-data.service';
import { CalibreService } from '../../../core/services/calibre.service';
import { CategoryService } from '../../../core/services/category.service';
import { MarcaService } from '../../../core/services/marca.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { SearchSelectComponent } from '../../../shared/components/search-select/search-select.component';
import { formatMedidasCm, formatStickybackMedidas } from '../../../core/utils/dimensions.util';

@Component({
  selector: 'app-movement-form',
  imports: [ReactiveFormsModule, RouterLink, SearchSelectComponent],
  templateUrl: './movement-form.component.html',
  styleUrl: './movement-form.component.scss',
})
export class MovementFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly movementService = inject(MovementService);
  private readonly productService = inject(ProductService);
  private readonly dataService = inject(InventarioDataService);
  private readonly calibreService = inject(CalibreService);
  private readonly marcaService = inject(MarcaService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  protected readonly categories = this.categoryService.getActive();
  protected readonly movementLabels = MOVEMENT_LABELS;

  protected readonly direccion = signal<MovementDirection>('subida');
  protected readonly tipoSeleccionado = signal<MovementType>('entrada_compra');
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly availableLotes = signal<LoteStock[]>([]);
  protected readonly loadingLotes = signal(false);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly selectedLote = signal<LoteStock | null>(null);

  private readonly loadLotesRequest$ = new Subject<{ productId: string; tipo: MovementType }>();
  private readonly silentValidity = { emitEvent: false };

  protected readonly isBajada = computed(() => this.direccion() === 'bajada');
  protected readonly isSubida = computed(() => this.direccion() === 'subida');

  protected readonly showLotePicker = computed(
    () =>
      this.isBajada() &&
      categoriaUsaLote(this.selectedProduct()?.categorySlug ?? 'otros') &&
      !!this.form.controls.productId.value,
  );

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

  protected readonly isConLote = computed(() =>
    categoriaUsaLote(this.selectedProduct()?.categorySlug ?? 'otros'),
  );

  protected readonly showProveedorSelect = computed(() => {
    if (this.direccion() !== 'subida') return false;
    return this.tipoSeleccionado() !== 'entrada_cliente';
  });

  protected readonly showProveedorReadonly = computed(() => {
    const tipo = this.form.controls.tipo.value;
    return this.isBajada() && !!tipo && requiresProveedor(tipo);
  });

  protected readonly proveedoresDisponibles = this.proveedorService.all;

  protected readonly proveedorOptions = computed(() =>
    this.proveedoresDisponibles().map((prov) => ({
      value: prov.id,
      label: prov.nombre,
      hint: prov.identificador,
    })),
  );

  protected readonly showFechaIngreso = computed(() => {
    if (this.isBajada()) return false;
    return this.lineasRequierenLote();
  });

  protected readonly showFechaExpiracion = computed(() => this.direccion() === 'subida');

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
    productId: [''],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    numeroLote: [''],
    loteKey: [''],
    fechaIngreso: [new Date().toISOString().split('T')[0]],
    fechaExpiracion: [''],
    proveedorId: [''],
    proveedor: [''],
    documentoRef: [''],
    motivo: [''],
    clienteTrabajo: [''],
    notas: [''],
    registrarRetazo: [false],
    retazoAncho: [null as number | null],
    retazoAlto: [null as number | null],
    retazoNotas: [''],
    lineas: this.fb.array([this.createLineaGroup()]),
  });

  protected readonly categorySlug = signal<ProductCategorySlug>('planchas');
  protected readonly marcaFilter = signal('');
  protected readonly calibreFilter = signal('');

  protected readonly showMarcaFilter = computed(
    () => this.categorySlug() === 'planchas' || categoriaEsRollo(this.categorySlug()),
  );

  protected readonly showCalibreFilter = computed(() => this.categorySlug() === 'planchas');

  protected readonly marcasDisponibles = computed(() =>
    this.marcaService.getByCategory(this.categorySlug()),
  );

  protected readonly calibresDisponibles = this.calibreService.all;

  protected readonly filteredProducts = computed(() => {
    const marcaId = this.marcaFilter();
    const calibre = this.calibreFilter();

    return this.productService.all().filter((p) => {
      if (!p.activo || p.categorySlug !== this.categorySlug()) return false;
      const productMarcaId = productoMarcaId(p);
      if (marcaId && productMarcaId !== marcaId) return false;
      if (calibre && p.plancha?.calibreId !== calibre) return false;
      return true;
    });
  });

  protected readonly filteredCount = computed(() => this.filteredProducts().length);

  protected get lineas(): FormArray {
    return this.form.controls.lineas;
  }

  ngOnInit(): void {
    this.dataService.ensureLoaded().subscribe();
    this.proveedorService.ensureLoaded().subscribe();
    this.categorySlug.set(this.form.controls.categorySlug.value as ProductCategorySlug);
    this.setupLoadLotesPipeline();

    this.form.controls.categorySlug.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((slug) => {
        this.categorySlug.set(slug as ProductCategorySlug);
        this.marcaService.ensureLoaded(slug as ProductCategorySlug).subscribe();
        this.clearProductFilters();
        if (this.isBajada()) {
          this.form.controls.productId.reset('', this.silentValidity);
          this.selectedProduct.set(null);
          this.selectedLote.set(null);
          this.availableLotes.set([]);
        }
      });

    this.form.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onTipoChange());

    this.form.controls.registrarRetazo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateValidators());

    this.form.controls.productId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.onProductChange(id));

    this.form.controls.loteKey.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((key) => this.onLoteKeyChange(key));

    this.syncLineasState();
    this.updateValidators();
  }

  protected setDireccion(dir: MovementDirection): void {
    this.direccion.set(dir);
    const tipos = dir === 'subida' ? TIPOS_SUBIDA : TIPOS_BAJADA;
    this.form.controls.tipo.setValue(tipos[0], this.silentValidity);
    this.tipoSeleccionado.set(tipos[0]);
    this.form.controls.loteKey.reset('', this.silentValidity);
    this.form.controls.numeroLote.reset('', this.silentValidity);
    this.form.controls.proveedorId.reset('', this.silentValidity);
    this.form.controls.proveedor.reset('', this.silentValidity);
    this.form.controls.fechaExpiracion.reset('', this.silentValidity);
    this.selectedLote.set(null);
    this.availableLotes.set([]);

    if (dir === 'subida' && this.lineas.length === 0) {
      this.addLinea();
    }

    this.errorMessage.set(null);

    const productId = this.form.controls.productId.value;
    if (productId && dir === 'bajada') {
      this.queueLoadLotes(productId);
    }

    this.updateValidators();
  }

  protected addLinea(): void {
    this.lineas.push(this.createLineaGroup());
    this.updateValidators();
  }

  protected removeLinea(index: number): void {
    if (this.lineas.length <= 1) return;
    this.lineas.removeAt(index);
    this.updateValidators();
  }

  protected onLineProductChange(): void {
    this.updateValidators();
  }

  protected isLineConLote(index: number): boolean {
    const productId = this.lineas.at(index).get('productId')?.value;
    if (!productId) return categoriaUsaLote(this.categorySlug());
    const slug = this.productService.getById(productId)?.categorySlug;
    return slug ? categoriaUsaLote(slug) : false;
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
      return formatMedidasCm(m.ancho, m.alto);
    }
    const rollo = productoRollo(product);
    if (rollo) {
      return formatStickybackMedidas(rollo.medidas.ancho, rollo.medidas.largo);
    }
    return product.nombre;
  }

  protected getProductLabel(product: Product): string {
    if (product.plancha) {
      const m = product.plancha.medidas;
      return `${product.nombre} · ${product.plancha.marca} · ${product.plancha.calibre} · ${formatMedidasCm(m.ancho, m.alto)}`;
    }
    const rollo = productoRollo(product);
    if (rollo) {
      return `${product.nombre} · ${rollo.marca} · ${formatStickybackMedidas(rollo.medidas.ancho, rollo.medidas.largo)}`;
    }
    return product.nombre;
  }

  protected formatLoteOption(lote: LoteStock): string {
    const tipo =
      lote.stockTipo === 'cliente'
        ? 'Cliente'
        : lote.stockTipo === 'propio'
          ? 'Propio'
          : `Consignación ${lote.proveedor ?? ''}`.trim();
    return `${lote.numeroLote} · ${tipo} · ${lote.cantidad} uds · ${lote.fechaIngreso}`;
  }

  protected getLoteKey(lote: LoteStock): string {
    return loteKey(lote);
  }

  protected formatStockTipo(tipo: LoteStock['stockTipo']): string {
    if (tipo === 'cliente') return 'Cliente';
    return tipo === 'propio' ? 'Propio' : 'Consignación';
  }

  protected onSubmit(): void {
    this.syncSelectedLoteFromForm();
    this.updateValidators();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.describeFormErrors());
      this.scrollToAlerts();
      return;
    }

    this.errorMessage.set(null);
    const raw = this.form.getRawValue();

    if (this.isSubida()) {
      this.submitSubida(raw);
      return;
    }

    this.submitBajada(raw);
  }

  private submitSubida(raw: ReturnType<typeof this.form.getRawValue>): void {
    if (raw.fechaExpiracion && raw.fechaIngreso && raw.fechaExpiracion < raw.fechaIngreso) {
      this.errorMessage.set('La fecha de expiración no puede ser anterior a la fecha de ingreso.');
      return;
    }

    const lineas = raw.lineas.filter((l) => l.productId);
    if (lineas.length === 0) {
      this.errorMessage.set('Agrega al menos un producto al ingreso.');
      return;
    }

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      const product = this.productService.getById(linea.productId);
      const requiereLote = product ? categoriaUsaLote(product.categorySlug) : false;

      if (requiereLote && !linea.numeroLote.trim()) {
        this.errorMessage.set(`La línea ${i + 1} requiere número de lote.`);
        return;
      }

      const exp = linea.fechaExpiracion || raw.fechaExpiracion;
      if (exp && raw.fechaIngreso && exp < raw.fechaIngreso) {
        this.errorMessage.set(`La fecha de expiración de la línea ${i + 1} es inválida.`);
        return;
      }
    }

    if (this.lineasRequierenLote() && !raw.fechaIngreso) {
      this.errorMessage.set('La fecha de ingreso es requerida para productos con control por lote.');
      return;
    }

    const data: BatchMovementFormData = {
      tipo: raw.tipo,
      proveedorId: raw.proveedorId,
      fechaIngreso: raw.fechaIngreso || undefined,
      fechaExpiracion: raw.fechaExpiracion || undefined,
      documentoRef: raw.documentoRef || undefined,
      motivo: raw.motivo || undefined,
      notas: raw.notas || undefined,
      lineas: lineas.map((l) => ({
        productId: l.productId,
        cantidad: l.cantidad,
        numeroLote: l.numeroLote.trim() || 'S/N',
        fechaExpiracion: l.fechaExpiracion || undefined,
      })),
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.movementService.registerBatchMovement(data).subscribe({
      next: ({ ingresoNumero, movements }) => {
        this.isSaving.set(false);
        this.successMessage.set(
          `Ingreso ${ingresoNumero} registrado con ${movements.length} producto${movements.length !== 1 ? 's' : ''}.`,
        );
        setTimeout(() => this.router.navigate(['/dashboard/movimientos']), 900);
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message ?? 'Error al registrar ingreso.');
      },
    });
  }

  private submitBajada(raw: ReturnType<typeof this.form.getRawValue>): void {
    const product = this.selectedProduct();
    const requiereLote = product ? categoriaUsaLote(product.categorySlug) : false;
    const selectedLote = this.resolveSelectedLote();

    if (requiereLote) {
      if (this.loadingLotes()) {
        this.errorMessage.set('Espera a que carguen los lotes disponibles.');
        this.scrollToAlerts();
        return;
      }

      if (this.availableLotes().length === 0) {
        this.errorMessage.set('Este producto no tiene lotes con stock disponible para dar de baja.');
        this.scrollToAlerts();
        return;
      }

      if (!selectedLote) {
        this.errorMessage.set('Selecciona el lote que se dará de baja.');
        this.scrollToAlerts();
        return;
      }
    }

    if (selectedLote && raw.cantidad > selectedLote.cantidad) {
      this.errorMessage.set(`La cantidad supera el stock del lote (${selectedLote.cantidad} uds).`);
      this.scrollToAlerts();
      return;
    }

    const data: MovementFormData = {
      direccion: 'bajada',
      tipo: raw.tipo,
      productId: raw.productId,
      cantidad: raw.cantidad,
      numeroLote: raw.numeroLote || selectedLote?.numeroLote || 'S/N',
      loteId: selectedLote?.loteId,
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

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.movementService.registerMovement(data).subscribe({
      next: ({ movement, retazo }) => {
        this.isSaving.set(false);
        let msg = `Movimiento ${movement.numero} registrado correctamente.`;
        if (retazo) {
          msg += ` Retazo ${retazo.codigo} creado.`;
        }
        this.successMessage.set(msg);
        setTimeout(() => this.router.navigate(['/dashboard/movimientos']), 900);
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message ?? 'Error al registrar.');
      },
    });
  }

  private createLineaGroup() {
    return this.fb.nonNullable.group({
      productId: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      numeroLote: [''],
      fechaExpiracion: [''],
    });
  }

  private lineasRequierenLote(): boolean {
    for (let i = 0; i < this.lineas.length; i++) {
      if (this.isLineConLote(i)) return true;
    }
    return false;
  }

  private syncProductSelection(): void {
    if (this.isSubida()) return;

    const currentId = this.form.controls.productId.value;
    if (!currentId) return;

    const stillValid = this.filteredProducts().some((p) => p.id === currentId);
    if (!stillValid) {
      this.form.controls.productId.reset('', this.silentValidity);
      this.selectedProduct.set(null);
      this.selectedLote.set(null);
      this.availableLotes.set([]);
    }
  }

  private onTipoChange(): void {
    this.tipoSeleccionado.set(this.form.controls.tipo.value);
    if (this.form.controls.tipo.value === 'entrada_cliente') {
      this.form.controls.proveedorId.reset('', this.silentValidity);
    }
    const productId = this.form.controls.productId.value;
    if (productId) {
      this.queueLoadLotes(productId);
    }
    this.updateValidators();
  }

  private onProductChange(productId: string): void {
    if (!productId) {
      this.selectedProduct.set(null);
      this.selectedLote.set(null);
      this.availableLotes.set([]);
      this.updateValidators();
      return;
    }

    const product = this.productService.getById(productId);
    this.selectedProduct.set(product ?? null);
    this.queueLoadLotes(productId);
    this.movementService.refreshStock(productId).subscribe();
    this.updateValidators();
  }

  private onLoteKeyChange(key: string): void {
    if (this.direccion() !== 'bajada' || !key) {
      this.selectedLote.set(null);
      return;
    }

    const lote = this.availableLotes().find((l) => loteKey(l) === key) ?? null;
    this.selectedLote.set(lote);
    if (lote) {
      this.applySelectedLote(lote);
      this.updateValidators();
    }
  }

  private setupLoadLotesPipeline(): void {
    this.loadLotesRequest$
      .pipe(
        switchMap(({ productId, tipo }) => {
          if (this.direccion() !== 'bajada') {
            return of([] as LoteStock[]);
          }

          this.loadingLotes.set(true);
          this.form.controls.loteKey.reset('', this.silentValidity);
          this.form.controls.numeroLote.reset('', this.silentValidity);
          this.selectedLote.set(null);

          return this.movementService.fetchLotes(productId, tipo).pipe(
            catchError(() => of([] as LoteStock[])),
            finalize(() => this.loadingLotes.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lotes) => {
        this.availableLotes.set(lotes);

        if (lotes.length === 1) {
          const lote = lotes[0];
          this.selectedLote.set(lote);
          this.form.controls.loteKey.setValue(loteKey(lote), this.silentValidity);
          this.applySelectedLote(lote);
        }

        this.updateValidators();
      });
  }

  private queueLoadLotes(productId: string): void {
    if (this.direccion() !== 'bajada') {
      this.availableLotes.set([]);
      this.selectedLote.set(null);
      return;
    }

    this.loadLotesRequest$.next({
      productId,
      tipo: this.form.controls.tipo.value,
    });
  }

  private applySelectedLote(lote: LoteStock): void {
    this.form.controls.numeroLote.setValue(lote.numeroLote, this.silentValidity);

    if (lote.proveedor) {
      this.form.controls.proveedor.setValue(lote.proveedor, this.silentValidity);
    } else if (!requiresProveedor(this.form.controls.tipo.value)) {
      this.form.controls.proveedor.reset('', this.silentValidity);
    }
  }

  private updateValidators(): void {
    this.syncLineasState();

    const tipo = this.form.controls.tipo.value;
    const isSubida = this.direccion() === 'subida';
    const isBajada = this.direccion() === 'bajada';
    const isConLote = this.isConLote();
    const hasLotes = this.availableLotes().length > 0;

    const productId = this.form.controls.productId;
    const lote = this.form.controls.numeroLote;
    const loteKeyControl = this.form.controls.loteKey;
    const fecha = this.form.controls.fechaIngreso;
    const proveedorId = this.form.controls.proveedorId;
    const proveedor = this.form.controls.proveedor;
    const cantidad = this.form.controls.cantidad;

    if (isSubida) {
      productId.clearValidators();
      cantidad.clearValidators();
      lote.clearValidators();
      loteKeyControl.clearValidators();
    } else {
      productId.setValidators([Validators.required]);

      if (isConLote) {
        loteKeyControl.setValidators(hasLotes ? [Validators.required] : []);
        lote.clearValidators();
      } else {
        lote.clearValidators();
        loteKeyControl.clearValidators();
      }

      cantidad.setValidators([Validators.required, Validators.min(1)]);
    }

    fecha.setValidators(isSubida && this.lineasRequierenLote() ? [Validators.required] : []);
    proveedorId.setValidators(isSubida && tipo !== 'entrada_cliente' ? [Validators.required] : []);
    proveedor.setValidators(isBajada && tipo && requiresProveedor(tipo) ? [Validators.required] : []);

    for (let i = 0; i < this.lineas.length; i++) {
      const linea = this.lineas.at(i);
      const numeroLoteLinea = linea.get('numeroLote');
      const productIdLinea = linea.get('productId');
      const cantidadLinea = linea.get('cantidad');

      if (isSubida) {
        productIdLinea?.setValidators([Validators.required]);
        cantidadLinea?.setValidators([Validators.required, Validators.min(1)]);

        if (this.isLineConLote(i)) {
          numeroLoteLinea?.setValidators([Validators.required]);
        } else {
          numeroLoteLinea?.clearValidators();
        }
      } else {
        productIdLinea?.clearValidators();
        cantidadLinea?.clearValidators();
        numeroLoteLinea?.clearValidators();
      }

      productIdLinea?.updateValueAndValidity({ emitEvent: false });
      cantidadLinea?.updateValueAndValidity({ emitEvent: false });
      numeroLoteLinea?.updateValueAndValidity({ emitEvent: false });
    }

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

    productId.updateValueAndValidity(this.silentValidity);
    lote.updateValueAndValidity(this.silentValidity);
    loteKeyControl.updateValueAndValidity(this.silentValidity);
    fecha.updateValueAndValidity(this.silentValidity);
    proveedorId.updateValueAndValidity(this.silentValidity);
    proveedor.updateValueAndValidity(this.silentValidity);
    cantidad.updateValueAndValidity(this.silentValidity);
    retazoAncho.updateValueAndValidity(this.silentValidity);
    retazoAlto.updateValueAndValidity(this.silentValidity);
    this.form.updateValueAndValidity(this.silentValidity);
  }

  private resolveSelectedLote(): LoteStock | null {
    const current = this.selectedLote();
    if (current) {
      return current;
    }

    const key = this.form.controls.loteKey.value;
    if (!key) {
      return null;
    }

    return this.availableLotes().find((l) => loteKey(l) === key) ?? null;
  }

  private syncSelectedLoteFromForm(): void {
    const lote = this.resolveSelectedLote();
    this.selectedLote.set(lote);

    if (lote) {
      this.applySelectedLote(lote);
    }
  }

  private syncLineasState(): void {
    if (this.direccion() === 'bajada') {
      if (this.lineas.enabled) {
        this.lineas.disable(this.silentValidity);
      }
      return;
    }

    if (this.lineas.disabled) {
      this.lineas.enable(this.silentValidity);
    }
  }

  private describeFormErrors(): string {
    if (this.isBajada()) {
      if (this.form.controls.loteKey.invalid) {
        return 'Selecciona el lote que se dará de baja.';
      }

      if (this.form.controls.productId.invalid) {
        return 'Selecciona un producto.';
      }

      const selectedLote = this.resolveSelectedLote();
      const cantidad = Number(this.form.controls.cantidad.value);
      if (selectedLote && cantidad > selectedLote.cantidad) {
        return `La cantidad supera el stock del lote (${selectedLote.cantidad} uds).`;
      }
    }

    return 'Revisa los campos obligatorios marcados en el formulario.';
  }

  private scrollToAlerts(): void {
    queueMicrotask(() => {
      document.querySelector('.movement-form .alert')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }
}
