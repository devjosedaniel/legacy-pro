import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductCategorySlug } from '../../../core/models/category.model';
import { OTRA_MARCA, Product } from '../../../core/models/product.model';
import { CalibreService } from '../../../core/services/calibre.service';
import { CategoryService } from '../../../core/services/category.service';
import { MarcaService } from '../../../core/services/marca.service';
import { ProductService } from '../../../core/services/product.service';

const SUPPORTED_CATEGORIES: ProductCategorySlug[] = ['planchas', 'stickyback'];

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './producto-form.component.html',
  styleUrl: './producto-form.component.scss',
})
export class ProductoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly calibreService = inject(CalibreService);
  private readonly marcaService = inject(MarcaService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly categories = this.categoryService.getActive();
  protected readonly calibres = this.calibreService.all;
  protected readonly supportedCategories = SUPPORTED_CATEGORIES;
  protected readonly otraMarca = OTRA_MARCA;

  protected readonly marcas = computed(() =>
    this.marcaService.getByCategory(this.categorySlug() || 'planchas'),
  );

  protected readonly isEdit = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showCustomMarca = signal(false);

  private productId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    categorySlug: ['' as ProductCategorySlug | '', Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    marcaId: [''],
    marcaCustom: [''],
    calibreId: ['', Validators.required],
    ancho: [null as number | null],
    alto: [null as number | null],
    stockMinimo: [2, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  protected readonly categorySlug = signal<ProductCategorySlug | ''>('');

  protected readonly selectedCategory = computed(() => {
    const slug = this.categorySlug();
    return slug ? this.categoryService.getBySlug(slug) : undefined;
  });

  protected readonly isPlanchas = computed(() => this.categorySlug() === 'planchas');
  protected readonly isStickyback = computed(() => this.categorySlug() === 'stickyback');
  protected readonly isInventarioConLote = computed(
    () => this.isPlanchas() || this.isStickyback(),
  );

  protected readonly isCategorySupported = computed(() => {
    const slug = this.categorySlug();
    return slug ? SUPPORTED_CATEGORIES.includes(slug) : false;
  });

  ngOnInit(): void {
    this.marcaService.ensureLoaded('planchas').subscribe();

    this.form.controls.categorySlug.valueChanges.subscribe((slug) => {
      this.categorySlug.set(slug);
      this.updateCategoryValidators(slug);
      this.errorMessage.set(null);

      if (slug) {
        this.marcaService.ensureLoaded(slug as ProductCategorySlug).subscribe();
      }
    });

    this.form.controls.marcaId.valueChanges.subscribe((marcaId) => {
      this.showCustomMarca.set(marcaId === OTRA_MARCA);
      if (marcaId !== OTRA_MARCA) {
        this.form.controls.marcaCustom.reset('');
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.productId = id;
      this.loadProduct(id);
    }
  }

  protected get pageTitle(): string {
    if (this.isEdit()) {
      const cat = this.selectedCategory();
      return cat ? `Editar producto · ${cat.name}` : 'Editar producto';
    }
    return 'Nuevo producto';
  }

  protected selectCategory(slug: ProductCategorySlug): void {
    if (this.isEdit()) return;
    this.form.controls.categorySlug.setValue(slug);
    this.form.controls.categorySlug.markAsTouched();
  }

  protected onSubmit(): void {
    this.updateCategoryValidators(this.form.controls.categorySlug.value);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const slug = this.form.controls.categorySlug.value as ProductCategorySlug;
    if (!SUPPORTED_CATEGORIES.includes(slug)) {
      this.errorMessage.set('El formulario para esta categoría estará disponible próximamente.');
      return;
    }

    const needsMarca = slug === 'planchas' || slug === 'stickyback';
    const marcaPayload = needsMarca ? this.resolveMarcaPayload() : {};
    if (needsMarca && !marcaPayload.marcaId && !marcaPayload.marca) {
      this.errorMessage.set('Indica la marca del producto.');
      return;
    }

    const raw = this.form.getRawValue();
    const data = {
      categorySlug: slug,
      nombre: raw.nombre,
      ...marcaPayload,
      calibreId: raw.calibreId || undefined,
      ancho: raw.ancho ?? undefined,
      alto: raw.alto ?? undefined,
      stockMinimo: raw.stockMinimo,
      notas: raw.notas || undefined,
    };

    const usedCustomMarca = this.form.controls.marcaId.value === OTRA_MARCA;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request$ =
      this.isEdit() && this.productId
        ? this.productService.updateProduct(this.productId, data)
        : this.productService.createProduct(data);

    request$.subscribe({
      next: () => {
        if (usedCustomMarca) {
          this.marcaService.refreshByCategory(slug).subscribe();
        }

        this.isSaving.set(false);
        if (this.isEdit()) {
          this.successMessage.set('Producto actualizado correctamente.');
        } else {
          this.router.navigate(['/dashboard/productos'], {
            state: { successMessage: 'Producto guardado correctamente.' },
          });
        }
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message ?? 'Error al guardar.');
      },
    });
  }

  private loadProduct(id: string): void {
    this.productService.fetchById(id).subscribe({
      next: (product) => this.patchProductForm(product),
      error: () => this.router.navigate(['/dashboard/productos']),
    });
  }

  private patchProductForm(product: Product): void {
    this.form.controls.categorySlug.setValue(product.categorySlug);
    this.form.controls.categorySlug.disable();

    if (product.categorySlug === 'planchas' && product.plancha) {
      this.patchMarcaMedidas(product, product.plancha.marcaId, product.plancha.marca, {
        calibreId: product.plancha.calibreId,
        ancho: product.plancha.medidas.ancho,
        alto: product.plancha.medidas.alto,
      });
    } else if (product.categorySlug === 'stickyback' && product.stickyback) {
      this.patchMarcaMedidas(product, product.stickyback.marcaId, product.stickyback.marca, {
        ancho: product.stickyback.medidas.ancho,
        alto: product.stickyback.medidas.largo,
      });
    }

    this.updateCategoryValidators(product.categorySlug);
    this.categorySlug.set(product.categorySlug);
  }

  private patchMarcaMedidas(
    product: Product,
    marcaId: string,
    marcaNombre: string,
    medidas: { calibreId?: string; ancho: number; alto: number },
  ): void {
    this.marcaService.ensureLoaded(product.categorySlug).subscribe(() => {
      const marcaKnown = this.marcaService
        .getByCategory(product.categorySlug)
        .some((m) => m.id === marcaId);

      this.showCustomMarca.set(!marcaKnown);

      this.form.patchValue({
        nombre: product.nombre,
        marcaId: marcaKnown ? marcaId : OTRA_MARCA,
        marcaCustom: marcaKnown ? '' : marcaNombre,
        calibreId: medidas.calibreId ?? '',
        ancho: medidas.ancho,
        alto: medidas.alto,
        stockMinimo: product.stockMinimo,
        notas: product.notas ?? '',
      });
    });
  }

  private updateCategoryValidators(slug: ProductCategorySlug | ''): void {
    const isPlanchas = slug === 'planchas';
    const isStickyback = slug === 'stickyback';
    const needsMedidas = isPlanchas || isStickyback;
    const marcaId = this.form.controls.marcaId;
    const calibreId = this.form.controls.calibreId;
    const ancho = this.form.controls.ancho;
    const alto = this.form.controls.alto;

    if (needsMedidas) {
      marcaId.setValidators([Validators.required]);
      ancho.setValidators([Validators.required, Validators.min(0.01)]);
      alto.setValidators([Validators.required, Validators.min(0.01)]);
    } else {
      marcaId.clearValidators();
      ancho.clearValidators();
      alto.clearValidators();
    }

    if (isPlanchas) {
      calibreId.setValidators([Validators.required]);
    } else {
      calibreId.clearValidators();
    }

    marcaId.updateValueAndValidity();
    calibreId.updateValueAndValidity();
    ancho.updateValueAndValidity();
    alto.updateValueAndValidity();
  }

  private resolveMarcaPayload(): { marcaId?: string; marca?: string } {
    const marcaId = this.form.controls.marcaId.value;
    if (marcaId === OTRA_MARCA) {
      const nombre = this.form.controls.marcaCustom.value.trim().toUpperCase();
      return nombre ? { marca: nombre } : {};
    }

    return marcaId ? { marcaId } : {};
  }
}
