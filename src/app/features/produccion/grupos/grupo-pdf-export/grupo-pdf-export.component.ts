import { Component, computed, input, viewChild } from '@angular/core';
import { GrupoProduccion } from '../../../../core/models/grupo-produccion.model';
import {
  buildArmadoReportContextFromGrupo,
  rebuildArmadoFromGrupo,
} from '../../../../core/utils/grupo-armado.util';
import { ArmadoPreviewComponent } from '../armado-preview/armado-preview.component';

@Component({
  selector: 'app-grupo-pdf-export',
  imports: [ArmadoPreviewComponent],
  template: `
    @if (grupo() && armado()) {
      <div class="grupo-pdf-export" aria-hidden="true">
        <app-armado-preview
          #preview
          [armado]="armado()!"
          [materialAnchoCm]="materialAnchoCm()"
          [materialAltoCm]="materialAltoCm()"
          [materialTipo]="materialTipo()"
          [downloadFileName]="downloadFileName()"
          [reportContext]="reportContext()"
        />
      </div>
    }
  `,
  styles: `
    .grupo-pdf-export {
      position: fixed;
      left: -10000px;
      top: 0;
      width: 900px;
      pointer-events: none;
      visibility: hidden;
    }
  `,
})
export class GrupoPdfExportComponent {
  readonly grupo = input<GrupoProduccion | null>(null);

  protected readonly preview = viewChild<ArmadoPreviewComponent>('preview');

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

  async exportPdf(): Promise<void> {
    const preview = this.preview();
    if (!preview) {
      throw new Error('No hay datos de armado para generar el PDF.');
    }

    await preview.exportReport();
  }
}
