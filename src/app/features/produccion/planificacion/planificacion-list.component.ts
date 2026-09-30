import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdenProduccion } from '../../../core/models/orden-produccion.model';
import { OrdenProduccionService } from '../../../core/services/orden-produccion.service';
import { urgenciaLabel } from '../../../core/utils/urgencia.util';

const FILTERS_STORAGE_KEY = 'inv.produccion.planificacion.filters';

interface PlanificacionSavedFilters {
  search?: string;
  calibreId?: string;
  estado?: string;
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^(op|sis)[\s\-]*/i, '')
    .trim();
}

@Component({
  selector: 'app-planificacion-list',
  imports: [RouterLink],
  templateUrl: './planificacion-list.component.html',
  styleUrl: './planificacion-list.component.scss',
})
export class PlanificacionListComponent implements OnInit {
  private readonly ordenService = inject(OrdenProduccionService);

  protected readonly search = signal('');
  protected readonly calibreFilter = signal('');
  protected readonly estadoFilter = signal('');
  protected readonly ordenes = signal<OrdenProduccion[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly urgenciaLabel = urgenciaLabel;

  protected readonly calibres = computed(() => {
    const map = new Map<number, string>();
    for (const orden of this.ordenes()) {
      map.set(orden.calibreId, orden.calibreNombre);
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id: String(id), nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  });

  protected readonly estados = computed(() => {
    const set = new Set<string>();
    for (const orden of this.ordenes()) {
      if (orden.estadoOrdenNombre) set.add(orden.estadoOrdenNombre);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly filtered = computed(() => {
    const query = normalizeSearch(this.search());
    const calibre = this.calibreFilter();
    const estado = this.estadoFilter();

    return this.ordenes().filter((orden) => {
      if (calibre && String(orden.calibreId) !== calibre) return false;
      if (estado && orden.estadoOrdenNombre !== estado) return false;

      if (!query) return true;

      const haystack = [
        orden.secuencia,
        orden.clienteNombre,
        orden.trabajoSecuencia ?? '',
        orden.detalle ?? '',
        orden.calibreNombre,
        orden.estadoOrdenNombre ?? '',
        orden.etapaNombre ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query) || haystack.includes(this.search().trim().toLowerCase());
    });
  });

  protected readonly tieneFiltros = computed(
    () => !!this.search().trim() || !!this.calibreFilter() || !!this.estadoFilter(),
  );

  protected readonly stats = computed(() => {
    const items = this.filtered();
    return {
      total: items.length,
      urgentes: items.filter((orden) => orden.urgencia === 1).length,
      emergentes: items.filter((orden) => orden.urgencia === 2).length,
    };
  });

  ngOnInit(): void {
    this.restoreFilters();
    this.load();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.persistFilters();
  }

  protected onCalibreChange(value: string): void {
    this.calibreFilter.set(value);
    this.persistFilters();
  }

  protected onEstadoChange(value: string): void {
    this.estadoFilter.set(value);
    this.persistFilters();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.calibreFilter.set('');
    this.estadoFilter.set('');
    this.clearPersistedFilters();
  }

  protected reload(): void {
    this.load();
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private persistFilters(): void {
    const payload: PlanificacionSavedFilters = {
      search: this.search(),
      calibreId: this.calibreFilter(),
      estado: this.estadoFilter(),
    };
    const hasSomething = !!payload.search?.trim() || !!payload.calibreId || !!payload.estado;

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

  private restoreFilters(): void {
    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) as PlanificacionSavedFilters;
      this.search.set(saved.search ?? '');
      this.calibreFilter.set(saved.calibreId ?? '');
      this.estadoFilter.set(saved.estado ?? '');
    } catch {
      /* ignore */
    }
  }

  private clearPersistedFilters(): void {
    try {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.ordenService.listPlanificacion().subscribe({
      next: (items) => {
        this.ordenes.set(items);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
