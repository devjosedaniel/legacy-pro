import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import {
  GRUPO_ESTADO_LABELS,
  GrupoProduccion,
  MATERIAL_LABELS,
} from '../../../../core/models/grupo-produccion.model';
import {
  GrupoHistorialFilters,
  GrupoProduccionService,
} from '../../../../core/services/grupo-produccion.service';
import { rebuildArmadoFromGrupo } from '../../../../core/utils/grupo-armado.util';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GrupoPdfExportComponent } from '../grupo-pdf-export/grupo-pdf-export.component';
import { GrupoReporteViewComponent } from '../grupo-reporte-view/grupo-reporte-view.component';

const PAGE_SIZE = 10;
type EstadoFiltro = 'activos' | 'produccion' | 'todos';

@Component({
  selector: 'app-grupos-list',
  imports: [RouterLink, PaginationComponent, GrupoPdfExportComponent, GrupoReporteViewComponent],
  templateUrl: './grupos-list.component.html',
  styleUrl: './grupos-list.component.scss',
})
export class GruposListComponent implements OnInit {
  private readonly grupoService = inject(GrupoProduccionService);
  private readonly pdfExport = viewChild(GrupoPdfExportComponent);

  protected readonly materialLabels = MATERIAL_LABELS;
  protected readonly estadoLabels = GRUPO_ESTADO_LABELS;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly estadoFilter = signal<EstadoFiltro>('todos');
  protected readonly activos = signal<GrupoProduccion[]>([]);
  protected readonly historial = signal<GrupoProduccion[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly usuario = signal('');

  protected readonly downloadingPdfId = signal<string | null>(null);
  protected readonly pdfExportGrupo = signal<GrupoProduccion | null>(null);
  protected readonly reporteViewGrupo = signal<GrupoProduccion | null>(null);
  protected readonly viewingReporteId = signal<string | null>(null);
  protected readonly pdfError = signal<string | null>(null);

  protected readonly gruposVisibles = computed(() => {
    const filtro = this.estadoFilter();
    if (filtro === 'activos') return this.activos();
    if (filtro === 'produccion') return this.historial();
    return [...this.activos(), ...this.historial()];
  });

  protected readonly showPagination = computed(
    () => this.estadoFilter() === 'produccion' || this.estadoFilter() === 'todos',
  );

  protected readonly tieneFiltros = computed(
    () => !!this.fechaDesde() || !!this.fechaHasta() || !!this.usuario().trim(),
  );

  ngOnInit(): void {
    this.cargar(1);
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTime(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected canDownloadPdf(grupo: GrupoProduccion): boolean {
    return !!rebuildArmadoFromGrupo(grupo);
  }

  protected onEstadoChange(value: string): void {
    this.estadoFilter.set(value as EstadoFiltro);
    this.cargar(1);
  }

  protected onFechaDesdeChange(event: Event): void {
    this.fechaDesde.set((event.target as HTMLInputElement).value);
  }

  protected onFechaHastaChange(event: Event): void {
    this.fechaHasta.set((event.target as HTMLInputElement).value);
  }

  protected onUsuarioChange(event: Event): void {
    this.usuario.set((event.target as HTMLInputElement).value);
  }

  protected aplicarFiltros(): void {
    if (this.fechaDesde() && this.fechaHasta() && this.fechaDesde() > this.fechaHasta()) {
      this.errorMessage.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.cargar(1);
  }

  protected limpiarFiltros(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.usuario.set('');
    this.cargar(1);
  }

  protected onPageChange(next: number): void {
    this.cargar(next);
  }

  protected verReporte(event: Event, grupo: GrupoProduccion): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.viewingReporteId() || this.downloadingPdfId()) return;

    this.pdfError.set(null);
    this.viewingReporteId.set(grupo.id);
    this.loadGrupoCompleto(grupo).subscribe({
      next: (full) => {
        if (!this.canDownloadPdf(full)) {
          this.pdfError.set(`El grupo #${full.id} no tiene datos de armado para mostrar.`);
          this.viewingReporteId.set(null);
          return;
        }
        this.reporteViewGrupo.set(full);
        this.viewingReporteId.set(null);
      },
      error: (err: Error) => {
        this.pdfError.set(err.message);
        this.viewingReporteId.set(null);
      },
    });
  }

  protected cerrarReporte(): void {
    this.reporteViewGrupo.set(null);
  }

  protected async descargarReporte(event: Event, grupo: GrupoProduccion): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (this.downloadingPdfId()) return;

    this.pdfError.set(null);
    this.downloadingPdfId.set(grupo.id);

    this.loadGrupoCompleto(grupo).subscribe({
      next: async (full) => {
        if (!this.canDownloadPdf(full)) {
          this.pdfError.set(`El grupo #${full.id} no tiene datos de armado para exportar.`);
          this.downloadingPdfId.set(null);
          return;
        }

        try {
          this.pdfExportGrupo.set(full);
          await this.waitForPdfPreview();
          await this.pdfExport()?.exportPdf();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo generar el PDF.';
          this.pdfError.set(message);
        } finally {
          this.pdfExportGrupo.set(null);
          this.downloadingPdfId.set(null);
        }
      },
      error: (err: Error) => {
        this.pdfError.set(err.message);
        this.downloadingPdfId.set(null);
      },
    });
  }

  private cargar(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filtro = this.estadoFilter();
    const filters = this.buildFilters();
    const needsActivos = filtro === 'activos' || filtro === 'todos';
    const needsHistorial = filtro === 'produccion' || filtro === 'todos';

    forkJoin({
      activos: needsActivos ? this.grupoService.listActivos() : of([]),
      historial: needsHistorial
        ? this.grupoService.fetchHistorial(page, PAGE_SIZE, filters)
        : of({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE }),
    }).subscribe({
      next: ({ activos, historial }) => {
        this.activos.set(activos);
        this.historial.set(historial.items);
        this.total.set(historial.total);
        this.page.set(historial.page);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  private buildFilters(): GrupoHistorialFilters | undefined {
    const fechaDesde = this.fechaDesde().trim();
    const fechaHasta = this.fechaHasta().trim();
    const usuario = this.usuario().trim();
    if (!fechaDesde && !fechaHasta && !usuario) return undefined;
    return {
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      usuario: usuario || undefined,
    };
  }

  private loadGrupoCompleto(grupo: GrupoProduccion) {
    return grupo.estado === 'terminado'
      ? this.grupoService.getHistorialById(grupo.id)
      : this.grupoService.getById(grupo.id);
  }

  private waitForPdfPreview(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempt = 0;
      const check = () => {
        if (this.pdfExport() && this.pdfExportGrupo()) {
          resolve();
          return;
        }
        if (attempt++ >= 30) {
          reject(new Error('No se pudo preparar la vista previa del armado.'));
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }
}
