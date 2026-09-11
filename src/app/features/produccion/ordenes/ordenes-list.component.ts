import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Calibre } from '../../../core/models/calibre.model';
import { Cliente } from '../../../core/models/cliente.model';
import { OrdenProduccion } from '../../../core/models/orden-produccion.model';
import { CalibreService } from '../../../core/services/calibre.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { OrdenProduccionService } from '../../../core/services/orden-produccion.service';
import { urgenciaLabel } from '../../../core/utils/urgencia.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select/search-select.component';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-ordenes-list',
  imports: [RouterLink, PaginationComponent, ReactiveFormsModule, SearchSelectComponent],
  templateUrl: './ordenes-list.component.html',
  styleUrl: './ordenes-list.component.scss',
})
export class OrdenesListComponent implements OnInit {
  private readonly ordenService = inject(OrdenProduccionService);
  private readonly calibreService = inject(CalibreService);
  private readonly clienteService = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly urgenciaLabel = urgenciaLabel;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly search = signal('');
  protected readonly clienteFilter = signal('');
  protected readonly clienteFilterControl = new FormControl('', { nonNullable: true });
  protected readonly calibreFilter = signal('');
  protected readonly ordenes = signal<OrdenProduccion[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly calibres = signal<Calibre[]>([]);

  protected readonly clienteOptions = computed((): SearchSelectOption[] =>
    this.clientes()
      .slice()
      .sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'))
      .map((cliente) => ({
        value: String(cliente.id),
        label: cliente.nombres,
      })),
  );

  protected readonly tieneFiltros = computed(
    () => !!this.search().trim() || !!this.clienteFilter() || !!this.calibreFilter(),
  );

  protected readonly stats = computed(() => ({
    total: this.total(),
    urgentes: this.ordenes().filter((orden) => orden.urgencia === 1).length,
    emergentes: this.ordenes().filter((orden) => orden.urgencia === 2).length,
  }));

  ngOnInit(): void {
    this.clienteFilterControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.clienteFilter.set(value);
      this.cargar(1);
    });

    this.clienteService.list().subscribe({
      next: (clientes) => this.clientes.set(clientes),
      error: () => this.clientes.set([]),
    });
    this.calibreService.ensureLoaded().subscribe({
      next: (calibres) => this.calibres.set(calibres),
      error: () => this.calibres.set([]),
    });
    this.cargar(1);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onCalibreChange(value: string): void {
    this.calibreFilter.set(value);
    this.cargar(1);
  }

  protected aplicarFiltros(): void {
    this.cargar(1);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.clienteFilter.set('');
    this.clienteFilterControl.setValue('', { emitEvent: false });
    this.calibreFilter.set('');
    this.cargar(1);
  }

  protected onPageChange(nextPage: number): void {
    this.cargar(nextPage);
  }

  protected reload(): void {
    this.cargar(this.page());
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private cargar(nextPage: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const clienteId = this.clienteFilter() ? Number(this.clienteFilter()) : null;
    const calibreId = this.calibreFilter() ? Number(this.calibreFilter()) : null;

    this.ordenService
      .fetchPage({
        page: nextPage,
        pageSize: PAGE_SIZE,
        detalle: this.search().trim() || undefined,
        clienteId: Number.isFinite(clienteId) ? clienteId : null,
        calibreId: Number.isFinite(calibreId) ? calibreId : null,
      })
      .subscribe({
        next: (result) => {
          this.ordenes.set(result.items);
          this.total.set(result.total);
          this.page.set(result.page);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
