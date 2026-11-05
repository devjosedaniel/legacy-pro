import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente } from '../../../core/models/cliente.model';
import { GuiaRemision } from '../../../core/models/guia-remision.model';
import { ClienteService } from '../../../core/services/cliente.service';
import { GuiaRemisionService } from '../../../core/services/guia-remision.service';
import { SRI_ESTADOS_FILTRO, sriBadgeClass, sriEstadoLabel } from '../../../core/utils/sri.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select/search-select.component';

const PAGE_SIZE = 15;
const FILTERS_STORAGE_KEY = 'inv.produccion.guias-remision.filters';

interface GuiasListSavedFilters {
  search?: string;
  clienteId?: string;
  sriEstado?: string;
  page?: number;
}

@Component({
  selector: 'app-guias-remision-list',
  imports: [RouterLink, PaginationComponent, ReactiveFormsModule, SearchSelectComponent],
  templateUrl: './guias-remision-list.component.html',
  styleUrl: './guias-remision-list.component.scss',
})
export class GuiasRemisionListComponent implements OnInit {
  private readonly guiaService = inject(GuiaRemisionService);
  private readonly clienteService = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly sriBadgeClass = sriBadgeClass;
  protected readonly sriEstadoLabel = sriEstadoLabel;
  protected readonly sriEstados = SRI_ESTADOS_FILTRO;
  protected readonly search = signal('');
  protected readonly clienteFilter = signal('');
  protected readonly sriFilter = signal('');
  protected readonly clienteFilterControl = new FormControl('', { nonNullable: true });
  protected readonly guias = signal<GuiaRemision[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly clientes = signal<Cliente[]>([]);

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
    () => !!this.search().trim() || !!this.clienteFilter() || !!this.sriFilter(),
  );

  ngOnInit(): void {
    const savedPage = this.restoreFilters();

    this.clienteFilterControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.clienteFilter.set(value);
      this.cargar(1);
    });

    this.clienteService.list().subscribe({
      next: (clientes) => this.clientes.set(clientes),
      error: () => this.clientes.set([]),
    });
    this.cargar(savedPage);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.persistFilters(this.page());
  }

  protected onSriChange(value: string): void {
    this.sriFilter.set(value);
    this.cargar(1);
  }

  protected aplicarFiltros(): void {
    this.cargar(1);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.clienteFilter.set('');
    this.clienteFilterControl.setValue('', { emitEvent: false });
    this.sriFilter.set('');
    this.clearPersistedFilters();
    this.cargar(1);
  }

  protected onPageChange(nextPage: number): void {
    this.cargar(nextPage);
  }

  protected reload(): void {
    this.cargar(this.page());
  }

  protected formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private cargar(nextPage: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.persistFilters(nextPage);

    const clienteId = this.clienteFilter() ? Number(this.clienteFilter()) : null;

    this.guiaService
      .fetchPage({
        page: nextPage,
        pageSize: PAGE_SIZE,
        busqueda: this.search().trim() || undefined,
        clienteId: Number.isFinite(clienteId) ? clienteId : null,
        estadoComprobante: this.sriFilter() || null,
      })
      .subscribe({
        next: (result) => {
          this.guias.set(result.items);
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

  private persistFilters(page: number): void {
    const payload: GuiasListSavedFilters = {
      search: this.search(),
      clienteId: this.clienteFilter(),
      sriEstado: this.sriFilter(),
      page,
    };
    const hasSomething = !!payload.search?.trim() || !!payload.clienteId || !!payload.sriEstado || page > 1;

    try {
      if (!hasSomething) {
        localStorage.removeItem(FILTERS_STORAGE_KEY);
        return;
      }
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private restoreFilters(): number {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) return 1;

      const saved = JSON.parse(raw) as GuiasListSavedFilters;
      this.search.set(saved.search ?? '');
      const clienteId = saved.clienteId ?? '';
      this.clienteFilter.set(clienteId);
      this.clienteFilterControl.setValue(clienteId, { emitEvent: false });
      this.sriFilter.set(saved.sriEstado ?? '');
      const page = Number(saved.page);
      return Number.isFinite(page) && page > 0 ? page : 1;
    } catch {
      return 1;
    }
  }

  private clearPersistedFilters(): void {
    try {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
