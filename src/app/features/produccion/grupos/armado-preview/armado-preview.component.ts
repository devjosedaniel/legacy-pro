import { DecimalPipe } from '@angular/common';
import { Component, computed, ElementRef, input, signal, viewChild } from '@angular/core';
import { ArmadoImportData, ArmadoPiezaPreview, MaterialTipo } from '../../../../core/models/grupo-produccion.model';
import {
  cmToMm,
  formatPiezaSizeCm,
  isPiezaColocada,
  piezaAltoCm,
  piezaAnchoCm,
  piezaXCm,
  piezaYCm,
  planchaAltoCm,
  planchaAnchoCm,
} from '../../../../core/utils/armado-units.util';
import {
  ArmadoReportContext,
  downloadBlob,
  downloadTextFile,
  generateArmadoReportPdf,
  prepareSvgForExport,
  resolveArmadoBaseName,
} from '../../../../core/utils/armado-report.util';
import { normalizeArmadoToMaterial } from '../../../../core/utils/armado-orientacion.util';

const PIECE_COLORS = [
  '#bfdbfe',
  '#bbf7d0',
  '#fde68a',
  '#fbcfe8',
  '#ddd6fe',
  '#a5f3fc',
  '#fed7aa',
  '#d9f99d',
  '#fecaca',
  '#c7d2fe',
];

const PIECE_STROKES = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#65a30d',
  '#dc2626',
  '#4f46e5',
];

const SCENE_PAD_MM = 12;
const COTA_OFFSET_MM = 36;
const COTA_LABEL_PAD_MM = 6;

interface PiezaVisual {
  indice: number;
  numero: number;
  nombre: string;
  x_mm: number;
  y_mm: number;
  ancho_mm: number;
  alto_mm: number;
  label_mm: number;
}
@Component({
  selector: 'app-armado-preview',
  imports: [DecimalPipe],
  templateUrl: './armado-preview.component.html',
  styleUrl: './armado-preview.component.scss',
})
export class ArmadoPreviewComponent {
  readonly armado = input.required<ArmadoImportData>();
  readonly materialAnchoCm = input<number | null>(null);
  readonly materialAltoCm = input<number | null>(null);
  readonly materialTipo = input<MaterialTipo | null>(null);
  readonly showDownload = input(false);
  readonly showLegend = input(true);
  readonly downloadFileName = input<string | null>(null);
  readonly reportContext = input<ArmadoReportContext | null>(null);

  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('layoutSvg');
  private readonly graphicRef = viewChild<ElementRef<HTMLElement>>('graphicCanvas');
  protected readonly downloadingReport = signal(false);

  /** Alinea coordenadas del CTA con el material seleccionado (p. ej. 203.2×127 → 127×203.2). */
  protected readonly armadoNormalizado = computed(() => {
    const data = this.armado();
    const anchoCm = this.materialAnchoCm();
    const altoCm = this.materialAltoCm();
    if (anchoCm && altoCm && anchoCm > 0 && altoCm > 0) {
      return normalizeArmadoToMaterial(data, anchoCm, altoCm).armado;
    }
    return data;
  });

  protected readonly materialSize = computed(() => {
    const anchoCm = this.materialAnchoCm();
    const altoCm = this.materialAltoCm();

    if (anchoCm && altoCm && anchoCm > 0 && altoCm > 0) {
      return {
        ancho_mm: anchoCm * 10,
        alto_mm: altoCm * 10,
        ancho_cm: anchoCm,
        alto_cm: altoCm,
        source: 'material' as const,
      };
    }

    const plancha = this.armadoNormalizado().plancha;
    const planchaAncho = planchaAnchoCm(plancha);
    const planchaAlto = planchaAltoCm(plancha);
    return {
      ancho_mm: cmToMm(planchaAncho),
      alto_mm: cmToMm(planchaAlto),
      ancho_cm: planchaAncho,
      alto_cm: planchaAlto,
      source: 'cta' as const,
    };
  });

  protected readonly cantidadPiezas = computed(
    () => this.armadoNormalizado().cantidad_piezas ?? this.armadoNormalizado().piezas.length,
  );

  protected readonly piezasLayout = computed(() =>
    [...this.armadoNormalizado().piezas]
      .filter((pieza) => this.isColocada(pieza))
      .sort((a, b) => this.pieceNumber(a) - this.pieceNumber(b)),
  );

  protected readonly visualTransform = computed(() => {
    const material = this.materialSize();
    const piezas = this.piezasLayout();

    if (piezas.length === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    const fitsRaw = piezas.every((pieza) => {
      const x = piezaXCm(pieza);
      const y = piezaYCm(pieza);
      const ancho = piezaAnchoCm(pieza);
      const alto = piezaAltoCm(pieza);
      const matAncho = material.ancho_cm;
      const matAlto = material.alto_cm;
      return (
        x >= -0.05 &&
        y >= -0.05 &&
        x + ancho <= matAncho + 0.05 &&
        y + alto <= matAlto + 0.05
      );
    });

    if (fitsRaw) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    return { scale: 1, offsetX: 0, offsetY: 0 };
  });

  protected readonly piezasVisuales = computed((): PiezaVisual[] => {
    const { scale, offsetX, offsetY } = this.visualTransform();
    const material = this.materialSize();
    const labelMm = Math.max(7, Math.min(material.ancho_mm, material.alto_mm) * 0.045);

    return this.piezasLayout().map((pieza) => {
      const xCm = piezaXCm(pieza) * scale + offsetX;
      const yCm = piezaYCm(pieza) * scale + offsetY;
      const anchoCm = piezaAnchoCm(pieza) * scale;
      const altoCm = piezaAltoCm(pieza) * scale;

      return {
        indice: pieza.indice,
        numero: this.pieceNumber(pieza),
        nombre: pieza.nombre,
        x_mm: cmToMm(xCm),
        y_mm: cmToMm(yCm),
        ancho_mm: cmToMm(anchoCm),
        alto_mm: cmToMm(altoCm),
        label_mm: labelMm,
      };
    });
  });

  protected readonly viewBox = computed(() => {
    const material = this.materialSize();
    const fontSize = this.cotaFontSize();
    const x = -SCENE_PAD_MM;
    const y = -SCENE_PAD_MM;
    const width = material.ancho_mm + SCENE_PAD_MM + COTA_OFFSET_MM + fontSize + COTA_LABEL_PAD_MM * 2;
    const height = material.alto_mm + SCENE_PAD_MM + COTA_OFFSET_MM + fontSize + COTA_LABEL_PAD_MM * 2;
    return `${x} ${y} ${width} ${height}`;
  });

  protected readonly cotaFontSize = computed(() => {
    const material = this.materialSize();
    return Math.max(18, Math.min(material.ancho_mm, material.alto_mm) * 0.045);
  });

  protected readonly materialLabel = computed(() => {
    const tipo = this.materialTipo();
    if (tipo === 'retazo') return 'Retazo';
    if (tipo === 'plancha') return 'Plancha';
    return 'Material';
  });

  protected readonly cotaHorizontal = computed(() => {
    const material = this.materialSize();
    const fontSize = this.cotaFontSize();
    const y = material.alto_mm + COTA_OFFSET_MM;
    const text = `${this.formatCm(material.ancho_cm)} cm`;
    const labelW = text.length * fontSize * 0.58 + COTA_LABEL_PAD_MM * 2;
    const labelH = fontSize + COTA_LABEL_PAD_MM * 2;
    const midX = material.ancho_mm / 2;

    return {
      y,
      text,
      midX,
      labelW,
      labelH,
      gapStart: Math.max(0, midX - labelW / 2),
      gapEnd: Math.min(material.ancho_mm, midX + labelW / 2),
    };
  });

  protected readonly cotaVertical = computed(() => {
    const material = this.materialSize();
    const fontSize = this.cotaFontSize();
    const x = material.ancho_mm + COTA_OFFSET_MM;
    const text = `${this.formatCm(material.alto_cm)} cm`;
    const labelW = fontSize + COTA_LABEL_PAD_MM * 2;
    const labelH = text.length * fontSize * 0.58 + COTA_LABEL_PAD_MM * 2;
    const midY = material.alto_mm / 2;

    return {
      x,
      text,
      textX: x + labelW / 2 + 2,
      midY,
      labelW,
      labelH,
      gapStart: Math.max(0, midY - labelH / 2),
      gapEnd: Math.min(material.alto_mm, midY + labelH / 2),
    };
  });

  protected color(index: number): string {
    return PIECE_COLORS[index % PIECE_COLORS.length];
  }

  protected stroke(index: number): string {
    return PIECE_STROKES[index % PIECE_STROKES.length];
  }

  protected labelX(pieza: PiezaVisual): number {
    return pieza.x_mm + pieza.ancho_mm / 2;
  }

  protected labelY(pieza: PiezaVisual): number {
    return pieza.y_mm + pieza.alto_mm / 2;
  }

  protected pieceNumber(pieza: ArmadoPiezaPreview): number {
    return pieza.numero ?? pieza.indice + 1;
  }

  protected downloadLayout(): void {
    const svgMarkup = this.buildSvgMarkup();
    if (!svgMarkup) return;

    downloadTextFile(svgMarkup, `${resolveArmadoBaseName(this.armado(), this.downloadFileName())}-layout.svg`, 'image/svg+xml;charset=utf-8');
  }

  async exportReport(): Promise<void> {
    await this.downloadReport();
  }

  protected async downloadReport(): Promise<void> {
    const graphicElement = this.graphicRef()?.nativeElement;
    if (!graphicElement || this.downloadingReport()) return;

    this.downloadingReport.set(true);

    try {
      const material = this.materialSize();
      const blob = await generateArmadoReportPdf({
        armado: this.armadoNormalizado(),
        materialLabel: this.materialLabel(),
        materialAnchoCm: material.ancho_cm,
        materialAltoCm: material.alto_cm,
        cantidadPiezas: this.cantidadPiezas(),
        graphicElement,
        piezas: this.piezasLayout(),
        pieceNumber: (pieza) => this.pieceNumber(pieza),
        context: this.reportContext(),
      });

      downloadBlob(blob, `${resolveArmadoBaseName(this.armado(), this.downloadFileName())}-reporte.pdf`);
    } finally {
      this.downloadingReport.set(false);
    }
  }

  private buildSvgMarkup(): string | null {
    const svgEl = this.svgRef()?.nativeElement;
    if (!svgEl) return null;
    return prepareSvgForExport(svgEl);
  }

  protected isColocada(pieza: ArmadoPiezaPreview): boolean {
    return isPiezaColocada(pieza);
  }

  protected piezaSizeLabel(pieza: ArmadoPiezaPreview): string {
    return formatPiezaSizeCm(pieza);
  }

  private formatCm(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}
