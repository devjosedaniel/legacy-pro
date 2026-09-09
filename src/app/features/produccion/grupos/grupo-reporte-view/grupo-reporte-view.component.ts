import { Component, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { ArmadoPiezaPreview, GrupoProduccion } from '../../../../core/models/grupo-produccion.model';
import { normalizeArmadoToMaterial } from '../../../../core/utils/armado-orientacion.util';
import { buildArmadoReportCampos } from '../../../../core/utils/armado-report.util';
import {
  formatPiezaCm,
  isPiezaColocada,
  piezaAltoCm,
  piezaAnchoCm,
  piezaXCm,
  piezaYCm,
} from '../../../../core/utils/armado-units.util';
import {
  buildArmadoReportContextFromGrupo,
  rebuildArmadoFromGrupo,
} from '../../../../core/utils/grupo-armado.util';
import { ArmadoPreviewComponent } from '../armado-preview/armado-preview.component';

@Component({
  selector: 'app-grupo-reporte-view',
  imports: [ArmadoPreviewComponent],
  templateUrl: './grupo-reporte-view.component.html',
  styleUrl: './grupo-reporte-view.component.scss',
})
export class GrupoReporteViewComponent {
  readonly grupo = input<GrupoProduccion | null>(null);
  readonly closed = output<void>();

  private readonly preview = viewChild(ArmadoPreviewComponent);
  protected readonly downloadingPdf = signal(false);

  constructor() {
    effect((onCleanup) => {
      const open = !!this.grupo();
      if (!open) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      onCleanup(() => {
        document.body.style.overflow = previous;
      });
    });
  }

  protected readonly formatPiezaCm = formatPiezaCm;
  protected readonly piezaAnchoCm = piezaAnchoCm;
  protected readonly piezaAltoCm = piezaAltoCm;
  protected readonly piezaXCm = piezaXCm;
  protected readonly piezaYCm = piezaYCm;

  protected readonly armado = computed(() => {
    const grupo = this.grupo();
    return grupo ? rebuildArmadoFromGrupo(grupo) : null;
  });

  protected readonly materialAnchoCm = computed(() => this.grupo()?.materialAnchoCm ?? null);
  protected readonly materialAltoCm = computed(() => this.grupo()?.materialAltoCm ?? null);
  protected readonly materialTipo = computed(() => this.grupo()?.material?.tipo ?? null);

  protected readonly downloadFileName = computed(() => {
    const grupo = this.grupo();
    return grupo ? `grupo-${grupo.id}` : null;
  });

  protected readonly reportContext = computed(() => {
    const grupo = this.grupo();
    return grupo ? buildArmadoReportContextFromGrupo(grupo) : null;
  });

  protected readonly armadoNormalizado = computed(() => {
    const armado = this.armado();
    const ancho = this.materialAnchoCm();
    const alto = this.materialAltoCm();
    if (!armado) return null;
    if (ancho && alto && ancho > 0 && alto > 0) {
      return normalizeArmadoToMaterial(armado, ancho, alto).armado;
    }
    return armado;
  });

  protected readonly piezas = computed(() => {
    const armado = this.armadoNormalizado();
    if (!armado) return [];
    return [...armado.piezas]
      .filter((pieza) => isPiezaColocada(pieza))
      .sort((a, b) => this.pieceNumber(a) - this.pieceNumber(b));
  });

  protected readonly materialLabel = computed(() => {
    const tipo = this.materialTipo();
    if (tipo === 'retazo') return 'Retazo';
    if (tipo === 'plancha') return 'Plancha';
    return 'Material';
  });

  protected readonly campos = computed(() => {
    const armado = this.armadoNormalizado();
    const ancho = this.materialAnchoCm();
    const alto = this.materialAltoCm();
    if (!armado || !ancho || !alto) return [];

    return buildArmadoReportCampos({
      armado,
      materialLabel: this.materialLabel(),
      materialAnchoCm: ancho,
      materialAltoCm: alto,
      cantidadPiezas: this.piezas().length,
      piezas: this.piezas(),
      pieceNumber: (pieza) => this.pieceNumber(pieza),
      context: this.reportContext(),
    });
  });

  protected readonly titulo = computed(
    () => this.reportContext()?.titulo?.trim() || 'Reporte de armado',
  );

  protected readonly retazos = computed(() => this.reportContext()?.retazos ?? []);

  protected pieceNumber(pieza: ArmadoPiezaPreview): number {
    return pieza.numero ?? pieza.indice + 1;
  }

  protected close(): void {
    this.closed.emit();
  }

  protected async downloadPdf(): Promise<void> {
    const preview = this.preview();
    if (!preview || this.downloadingPdf()) return;
    this.downloadingPdf.set(true);
    try {
      await preview.exportReport();
    } finally {
      this.downloadingPdf.set(false);
    }
  }
}
