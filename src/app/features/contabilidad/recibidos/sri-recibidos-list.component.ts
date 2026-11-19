import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SriRecibido, SRI_TIPOS } from '../../../core/models/sri-recibido.model';
import { SriRecibidoService } from '../../../core/services/sri-recibido.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 20;
const POLL_MS = 4000;
const FILTERS_KEY = 'sri-recibidos.list.filters.v1';

interface SriRecibidosSavedFilters {
  search?: string;
  estado?: string;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}

@Component({
  selector: 'app-sri-recibidos-list',
  imports: [RouterLink, PaginationComponent, CurrencyPipe],
  templateUrl: './sri-recibidos-list.component.html',
  styleUrl: './sri-recibidos-list.component.scss',
})
export class SriRecibidosListComponent implements OnInit, OnDestroy {
  private readonly api = inject(SriRecibidoService);
  private readonly router = inject(Router);

  protected readonly tipos = SRI_TIPOS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly search = signal('');
  protected readonly estadoFilter = signal('');
  protected readonly tipoFilter = signal('');
  protected readonly fechaDesde = signal(this.primerDiaMes());
  protected readonly fechaHasta = signal(this.hoy());
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly pendientes = signal(0);
  protected readonly errores = signal(0);
  protected readonly enProceso = signal(false);
  protected readonly loading = signal(false);
  protected readonly starting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly items = signal<SriRecibido[]>([]);
  protected readonly estancado = signal(false);
  protected readonly ingresandoId = signal<number | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPendientes = -1;
  private stallTicks = 0;

  ngOnInit(): void {
    const state = history.state as { successMessage?: string; consultar?: boolean } | null;
    if (state?.successMessage) {
      this.successMessage.set(state.successMessage);
      history.replaceState({ ...history.state, successMessage: undefined, consultar: undefined }, '');
    }
    this.cargar(this.restoreFilters());
  }

  ngOnDestroy(): void {
    this.stopPoll();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.persistFilters(this.page());
  }

  protected onEstado(value: string): void {
    this.estadoFilter.set(value);
    this.cargar(1);
  }

  protected onTipo(value: string): void {
    this.tipoFilter.set(value);
    this.cargar(1);
  }

  protected onFechaDesde(value: string): void {
    this.fechaDesde.set(value);
    this.persistFilters(this.page());
  }

  protected onFechaHasta(value: string): void {
    this.fechaHasta.set(value);
    this.persistFilters(this.page());
  }

  protected buscar(): void {
    this.cargar(1);
  }

  protected cargar(page: number): void {
    this.page.set(page);
    if (!this.enProceso()) {
      this.loading.set(true);
    }
    this.errorMessage.set(null);
    this.api
      .list({
        limite: PAGE_SIZE,
        pagina: page,
        busqueda: this.search().trim(),
        estado: this.estadoFilter(),
        tipo: this.tipoFilter(),
        fechaDesde: this.fechaDesde(),
        fechaHasta: this.fechaHasta(),
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.pendientes.set(res.pendientes);
          this.errores.set(res.errores);
          this.enProceso.set(res.enProceso);
          this.loading.set(false);
          if (res.enProceso && res.pendientes === this.lastPendientes) {
            this.stallTicks += 1;
          } else {
            this.stallTicks = 0;
          }
          this.lastPendientes = res.pendientes;
          this.estancado.set(res.enProceso && this.stallTicks >= 5);
          this.syncPoll(res.enProceso);
          this.persistFilters(this.page());
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected consultarPendientes(reintentar = false): void {
    if (this.starting() || this.enProceso()) return;
    this.starting.set(true);
    this.errorMessage.set(null);
    this.api.consultarLote(reintentar).subscribe({
      next: (res) => {
        this.starting.set(false);
        this.pendientes.set(res.pendientes);
        this.errores.set(res.errores);
        this.enProceso.set(res.enProceso);
        this.successMessage.set(res.mensaje);
        this.syncPoll(res.enProceso);
        this.cargar(this.page());
      },
      error: (err: Error) => {
        this.starting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected abrir(item: SriRecibido): void {
    void this.router.navigate(['/dashboard/contabilidad/recibidos', item.id]);
  }

  protected estadoSlug(estado: string): string {
    return estado.toLowerCase().replace(/\s+/g, '-');
  }

  protected facturaLabel(item: SriRecibido): string {
    const vinculo = item.facturaVinculo;
    if (!vinculo) return '—';
    if (vinculo.facturas.length === 1) {
      return vinculo.facturas[0].numeroDocumento || 'Factura encontrada';
    }
    if (vinculo.facturas.length > 1) {
      return vinculo.facturas.length + ' facturas';
    }
    return 'Sin factura';
  }

  protected puedeIngresar(item: SriRecibido): boolean {
    if (item.tipoComprobante !== '07' || item.estado !== 'AUTORIZADO') return false;
    const facturas = item.facturaVinculo?.facturas ?? [];
    return facturas.length === 1 && facturas[0].puedeIngresar;
  }

  protected ingresar(event: Event, item: SriRecibido): void {
    event.stopPropagation();
    if (this.ingresandoId() || !this.puedeIngresar(item)) return;
    const facturaId = item.facturaVinculo?.facturas[0]?.id;
    this.ingresandoId.set(item.id);
    this.errorMessage.set(null);
    this.api.ingresarRetencion(item.id, facturaId).subscribe({
      next: (mensaje) => {
        this.ingresandoId.set(null);
        this.successMessage.set(mensaje);
        this.cargar(this.page());
      },
      error: (err: Error) => {
        this.ingresandoId.set(null);
        this.errorMessage.set(err.message);
      },
    });
  }

  private syncPoll(enProceso: boolean): void {
    if (enProceso) {
      this.startPoll();
      return;
    }
    this.stopPoll();
  }

  private startPoll(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.cargar(this.page()), POLL_MS);
  }

  private stopPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private persistFilters(page: number): void {
    try {
      const payload: SriRecibidosSavedFilters = {
        search: this.search(),
        estado: this.estadoFilter(),
        tipo: this.tipoFilter(),
        fechaDesde: this.fechaDesde(),
        fechaHasta: this.fechaHasta(),
        page,
      };
      localStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private restoreFilters(): number {
    try {
      const raw = localStorage.getItem(FILTERS_KEY);
      if (!raw) return 1;
      const saved = JSON.parse(raw) as SriRecibidosSavedFilters;
      this.search.set(saved.search ?? '');
      this.estadoFilter.set(saved.estado ?? '');
      this.tipoFilter.set(saved.tipo ?? '');
      if (saved.fechaDesde) this.fechaDesde.set(saved.fechaDesde);
      if (saved.fechaHasta) this.fechaHasta.set(saved.fechaHasta);
      const page = Number(saved.page);
      return Number.isFinite(page) && page > 0 ? page : 1;
    } catch {
      return 1;
    }
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private primerDiaMes(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
