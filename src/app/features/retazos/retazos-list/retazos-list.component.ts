import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  RETAZO_ESTADO_LABELS,
  RETAZO_ORIGEN_LABELS,
  Retazo,
  RetazoCargaRow,
  RetazoEstado,
} from '../../../core/models/retazo.model';
import { ProductService } from '../../../core/services/product.service';
import { RetazoService } from '../../../core/services/retazo.service';
import { parseRetazosCsv } from '../../../core/utils/retazo-csv.parser';

@Component({
  selector: 'app-retazos-list',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './retazos-list.component.html',
  styleUrl: './retazos-list.component.scss',
})
export class RetazosListComponent implements OnInit {
  private readonly retazoService = inject(RetazoService);
  private readonly productService = inject(ProductService);
  private readonly fb = inject(FormBuilder);

  protected readonly retazoEstadoLabels = RETAZO_ESTADO_LABELS;
  protected readonly retazoOrigenLabels = RETAZO_ORIGEN_LABELS;

  protected readonly search = signal('');
  protected readonly estadoFilter = signal<RetazoEstado | 'all'>('disponible');
  protected readonly retazos = signal<Retazo[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly searched = signal(false);

  protected readonly previewRows = signal<RetazoCargaRow[]>([]);
  protected readonly parseErrors = signal<{ linea: number; mensaje: string }[]>([]);
  protected readonly importErrors = signal<{ linea: number; mensaje: string }[]>([]);
  protected readonly isImporting = signal(false);
  protected readonly selectedFileName = signal('');
  protected readonly isSavingManual = signal(false);
  protected readonly manualSuccess = signal<string | null>(null);
  protected readonly productsLoaded = signal(false);

  protected readonly productos = computed(() =>
    this.productService
      .planchas()
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  protected readonly manualForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    ancho: [null as number | null, [Validators.required, Validators.min(0.01)]],
    alto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    codigo: [''],
    notas: [''],
  });

  protected readonly csvTemplate = `codigo,sku,ancho,alto,notas
,DEMO-KODAK-114-80X10670,25,50,Sobrante de montaje
RTZ-2025-000100,DEMO-NYLO-112-67X100,30,40,`;

  ngOnInit(): void {
    this.productService.ensureLoaded().subscribe({
      next: () => this.productsLoaded.set(true),
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onEstadoChange(value: string): void {
    this.estadoFilter.set(value as RetazoEstado | 'all');
    if (this.searched()) {
      this.buscar();
    }
  }

  protected buscar(): void {
    const codigo = this.search().trim();
    if (codigo.length < 3) {
      this.errorMessage.set('Escribe al menos 3 caracteres del código.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.searched.set(true);

    this.retazoService.listAll({ codigo, estado: this.estadoFilter() }).subscribe({
      next: (items) => {
        this.retazos.set(items);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      this.processCsvText(text);
    };
    reader.readAsText(file);
    input.value = '';
  }

  protected loadTemplate(): void {
    this.processCsvText(this.csvTemplate);
    this.selectedFileName.set('plantilla-ejemplo.csv');
  }

  protected downloadTemplate(): void {
    const blob = new Blob([this.csvTemplate], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-retazos.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected importar(): void {
    const rows = this.previewRows();
    if (rows.length === 0) {
      this.errorMessage.set('No hay filas válidas para importar.');
      return;
    }

    this.isImporting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.importErrors.set([]);

    this.retazoService.cargaInicial(rows).subscribe({
      next: (result) => {
        this.isImporting.set(false);
        this.importErrors.set(result.errores);
        this.successMessage.set(result.mensaje);

        if (result.totalCreados > 0) {
          this.retazos.set(result.creados);
          this.searched.set(true);
          this.previewRows.set([]);
          this.selectedFileName.set('');
        }

        if (result.totalCreados === 0 && result.totalErrores > 0) {
          this.errorMessage.set('No se pudo cargar ningún retazo. Revisa los errores.');
        }
      },
      error: (err: Error) => {
        this.isImporting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected clearPreview(): void {
    this.previewRows.set([]);
    this.parseErrors.set([]);
    this.importErrors.set([]);
    this.selectedFileName.set('');
  }

  protected submitManual(): void {
    if (this.manualForm.invalid) {
      this.manualForm.markAllAsTouched();
      return;
    }

    const raw = this.manualForm.getRawValue();
    this.isSavingManual.set(true);
    this.manualSuccess.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.retazoService
      .create({
        productId: raw.productId,
        ancho: raw.ancho!,
        alto: raw.alto!,
        codigo: raw.codigo.trim() || undefined,
        notas: raw.notas.trim() || undefined,
      })
      .subscribe({
        next: (retazo) => {
          this.isSavingManual.set(false);
          this.manualSuccess.set(`Retazo ${retazo.codigo} registrado correctamente.`);
          this.manualForm.patchValue({ ancho: null, alto: null, codigo: '', notas: '' });
          this.retazos.set([retazo]);
          this.search.set(retazo.codigo);
          this.searched.set(true);
        },
        error: (err: Error) => {
          this.isSavingManual.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected updateEstado(retazo: Retazo, estado: RetazoEstado): void {
    this.retazoService.updateEstado(retazo.id, estado).subscribe({
      next: () => this.buscar(),
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  protected formatMedidas(ancho: number, alto: number): string {
    return `${ancho} × ${alto}`;
  }

  private processCsvText(text: string): void {
    const result = parseRetazosCsv(text);
    this.previewRows.set(result.rows);
    this.parseErrors.set(result.errores);
    this.importErrors.set([]);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
