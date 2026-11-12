import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Proveedor } from '../../../core/models/proveedor.model';
import { Transferencia, TransferenciaTipo } from '../../../core/models/transferencia.model';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { TransferenciaTipoService } from '../../../core/services/transferencia-tipo.service';
import { ReporteService } from '../../../core/services/reporte.service';
import { TransferenciaService } from '../../../core/services/transferencia.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select/search-select.component';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-transferencias-list',
  imports: [RouterLink, ReactiveFormsModule, PaginationComponent, SearchSelectComponent, CurrencyPipe],
  templateUrl: './transferencias-list.component.html',
  styleUrl: './transferencias-list.component.scss',
})
export class TransferenciasListComponent implements OnInit {
  private readonly transferenciaService = inject(TransferenciaService);
  private readonly tipoService = inject(TransferenciaTipoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly reporteService = inject(ReporteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tipos = signal<TransferenciaTipo[]>([]);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly search = signal('');
  protected readonly tipoFilter = signal<number | ''>('');
  protected readonly estadoFilter = signal<'activos' | 'anulados'>('activos');
  protected readonly proveedorFilter = signal('');
  protected readonly fechaDesde = signal(this.primerDiaMes());
  protected readonly fechaHasta = signal(this.hoy());
  protected readonly downloading = signal<'pdf' | 'excel' | null>(null);
  protected readonly proveedorControl = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly items = signal<Transferencia[]>([]);
  protected readonly proveedores = signal<Proveedor[]>([]);

  protected proveedorOptions(): SearchSelectOption[] {
    return this.proveedores().map((proveedor) => ({
      value: proveedor.id,
      label: proveedor.nombre,
    }));
  }

  ngOnInit(): void {
    const message = (history.state as { successMessage?: string } | null)?.successMessage;
    if (message) {
      this.successMessage.set(message);
      history.replaceState({ ...history.state, successMessage: undefined }, '');
      setTimeout(() => this.successMessage.set(null), 4000);
    }

    this.proveedorControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.proveedorFilter.set(value);
      this.cargar(1);
    });

    this.proveedorService.ensureLoaded().subscribe({
      next: (proveedores) => this.proveedores.set(proveedores.filter((item) => item.activo)),
      error: () => this.proveedores.set([]),
    });
    this.tipoService.loadTodos().subscribe({
      next: (tipos) => this.tipos.set(tipos),
      error: () => this.tipos.set([]),
    });
    this.cargar(1);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onTipo(value: string): void {
    this.tipoFilter.set(value ? Number(value) : '');
    this.cargar(1);
  }

  protected onEstado(value: string): void {
    this.estadoFilter.set(value === 'anulados' ? 'anulados' : 'activos');
    this.cargar(1);
  }

  protected onFechaDesde(value: string): void {
    this.fechaDesde.set(value);
  }

  protected onFechaHasta(value: string): void {
    this.fechaHasta.set(value);
  }

  protected buscar(): void {
    this.cargar(1);
  }

  protected descargar(formato: 'pdf' | 'excel'): void {
    const desde = this.fechaDesde().trim();
    const hasta = this.fechaHasta().trim();
    if (!desde || !hasta) {
      this.errorMessage.set('Indica el rango de fechas para el reporte.');
      return;
    }
    if (desde > hasta) {
      this.errorMessage.set('La fecha desde no puede ser mayor que la fecha hasta.');
      return;
    }

    this.downloading.set(formato);
    this.errorMessage.set(null);
    const tipoId = this.tipoFilter();
    this.transferenciaService
      .downloadReporte(formato, {
        fechaDesde: desde,
        fechaHasta: hasta,
        busqueda: this.search().trim(),
        tipoId: tipoId === '' ? null : tipoId,
        proveedorId: this.proveedorFilter() ? Number(this.proveedorFilter()) : null,
        estado: this.estadoFilter(),
      })
      .subscribe({
        next: (blob) => {
          const ext = formato === 'excel' ? 'xlsx' : 'pdf';
          this.reporteService.saveBlob(blob, `transferencias-${desde}-${hasta}.${ext}`);
          this.successMessage.set(formato === 'excel' ? 'Excel descargado.' : 'PDF descargado.');
          this.downloading.set(null);
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err: Error) => {
          this.downloading.set(null);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected onPageChange(page: number): void {
    this.cargar(page);
  }

  protected formatFecha(value: string): string {
    if (!value) return '—';
    const date = new Date(value + (value.length <= 10 ? 'T00:00:00' : ''));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-EC');
  }

  private hoy(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private primerDiaMes(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private cargar(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.page.set(page);
    const tipoId = this.tipoFilter();
    this.transferenciaService
      .list({
        limite: PAGE_SIZE,
        pagina: page,
        busqueda: this.search().trim(),
        tipoId: tipoId === '' ? null : tipoId,
        proveedorId: this.proveedorFilter() ? Number(this.proveedorFilter()) : null,
        estado: this.estadoFilter(),
        fechaDesde: this.fechaDesde().trim() || undefined,
        fechaHasta: this.fechaHasta().trim() || undefined,
      })
      .subscribe({
        next: ({ items, total }) => {
          this.items.set(items);
          this.total.set(total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }
}
