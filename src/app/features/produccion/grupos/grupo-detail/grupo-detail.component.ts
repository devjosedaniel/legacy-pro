import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  GRUPO_ESTADO_LABELS,
  GrupoProduccion,
  MATERIAL_LABELS,
} from '../../../../core/models/grupo-produccion.model';
import { GrupoProduccionService } from '../../../../core/services/grupo-produccion.service';
import {
  buildArmadoReportContextFromGrupo,
  rebuildArmadoFromGrupo,
} from '../../../../core/utils/grupo-armado.util';
import { GrupoPdfExportComponent } from '../grupo-pdf-export/grupo-pdf-export.component';
import { GrupoReporteViewComponent } from '../grupo-reporte-view/grupo-reporte-view.component';
import { ArmadoPreviewComponent } from '../armado-preview/armado-preview.component';

@Component({
  selector: 'app-grupo-detail',
  imports: [RouterLink, ArmadoPreviewComponent, GrupoPdfExportComponent, GrupoReporteViewComponent],
  templateUrl: './grupo-detail.component.html',
  styleUrl: './grupo-detail.component.scss',
})
export class GrupoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly grupoService = inject(GrupoProduccionService);
  private readonly pdfExport = viewChild(GrupoPdfExportComponent);

  protected readonly materialLabels = MATERIAL_LABELS;
  protected readonly estadoLabels = GRUPO_ESTADO_LABELS;

  protected readonly grupo = signal<GrupoProduccion | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pdfError = signal<string | null>(null);
  protected readonly downloadingPdf = signal(false);
  protected readonly showReporteModal = signal(false);
  protected readonly pdfExportGrupo = signal<GrupoProduccion | null>(null);

  protected readonly armado = computed(() => {
    const g = this.grupo();
    return g ? rebuildArmadoFromGrupo(g) : null;
  });

  protected readonly canExport = computed(() => !!this.armado());

  protected readonly reportContext = computed(() => {
    const g = this.grupo();
    return g ? buildArmadoReportContextFromGrupo(g) : null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Grupo no válido.');
      this.isLoading.set(false);
      return;
    }
    this.loadGrupo(id);
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatCm2(value?: number): string {
    if (value == null) return '—';
    return `${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} cm²`;
  }

  protected abrirReporte(): void {
    if (!this.canExport()) return;
    this.showReporteModal.set(true);
  }

  protected cerrarReporte(): void {
    this.showReporteModal.set(false);
  }

  protected async descargarPdf(): Promise<void> {
    const g = this.grupo();
    if (!g || !this.canExport() || this.downloadingPdf()) return;

    this.pdfError.set(null);
    this.downloadingPdf.set(true);

    try {
      this.pdfExportGrupo.set(g);
      await this.waitForPdfPreview();
      await this.pdfExport()?.exportPdf();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el PDF.';
      this.pdfError.set(message);
    } finally {
      this.pdfExportGrupo.set(null);
      this.downloadingPdf.set(false);
    }
  }

  private loadGrupo(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.grupoService.getById(id).subscribe({
      next: (grupo) => {
        this.grupo.set(grupo);
        this.isLoading.set(false);
      },
      error: () => {
        this.grupoService.getHistorialById(id).subscribe({
          next: (grupo) => {
            this.grupo.set(grupo);
            this.isLoading.set(false);
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.isLoading.set(false);
          },
        });
      },
    });
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
