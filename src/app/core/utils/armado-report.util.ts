import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ArmadoImportData, ArmadoPiezaPreview } from '../models/grupo-produccion.model';
import {
  formatPiezaCm,
  piezaAltoCm,
  piezaAnchoCm,
  piezaXCm,
  piezaYCm,
} from './armado-units.util';
import { calcularUsoArmado, formatCm2, ArmadoUsoStats } from './armado-calculo.util';

export interface ArmadoReportCampo {
  etiqueta: string;
  valor: string;
}

export interface ArmadoReportRetazo {
  codigo: string;
  anchoCm: number;
  altoCm: number;
}

export interface ArmadoReportContext {
  titulo?: string;
  /** Usuario que registró el grupo (creado_por), no quien exporta el PDF. */
  armadoPor?: string;
  campos?: ArmadoReportCampo[];
  retazos?: ArmadoReportRetazo[];
  consumoCm2?: number;
  areaUsadaCm2?: number;
  desperdicioCm2?: number;
}

export interface ArmadoReportPdfOptions {
  armado: ArmadoImportData;
  materialLabel: string;
  materialAnchoCm: number;
  materialAltoCm: number;
  cantidadPiezas: number;
  graphicElement: HTMLElement;
  piezas: ArmadoPiezaPreview[];
  pieceNumber: (pieza: ArmadoPiezaPreview) => number;
  context?: ArmadoReportContext | null;
}

export type ArmadoReportViewOptions = Omit<ArmadoReportPdfOptions, 'graphicElement'>;

const SVG_EXPORT_STYLES = `
  .armado-preview__plancha { fill: #ffffff; stroke: #64748b; stroke-width: 2; }
  .armado-preview__pieza rect { stroke-width: 1.5; }
  .armado-preview__pieza-label { font-weight: 700; fill: #0f172a; }
  .armado-preview__cotas { stroke: #475569; stroke-width: 1.2; fill: none; }
  .armado-preview__cota line { fill: none; stroke: inherit; stroke-width: inherit; }
  .armado-preview__cota-bg { fill: #ffffff; stroke: none; }
  .armado-preview__cota-label { fill: #1e293b; font-weight: 600; stroke: none; }
`;

const PAGE_MARGIN = 7;
const SLATE = [71, 85, 105] as const;
const SLATE_LIGHT = [241, 245, 249] as const;
const SUMMARY_COLS = 4;
const GRAPHIC_COLUMN_RATIO = 0.4;
const COLUMN_GAP = 5;

export function prepareSvgForExport(svgEl: SVGSVGElement): string {
  const clone = cloneSvgForExport(svgEl);
  return new XMLSerializer().serializeToString(clone);
}

function cloneSvgForExport(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = SVG_EXPORT_STYLES;
  clone.insertBefore(style, clone.firstChild);

  return clone;
}

function formatCmValue(value: number): string {
  return formatPiezaCm(value);
}

function formatCm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatGeneratedAt(): string {
  return new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveUsoMaterialStats(options: ArmadoReportViewOptions): ArmadoUsoStats | null {
  const { context, materialAnchoCm, materialAltoCm, piezas } = options;

  const areaRetazosCm2 = round2(
    (context?.retazos ?? []).reduce((sum, retazo) => sum + retazo.anchoCm * retazo.altoCm, 0),
  );
  const calculated = calcularUsoArmado(piezas, materialAnchoCm, materialAltoCm, areaRetazosCm2);
  if (!calculated) return null;

  return {
    ...calculated,
    consumoCm2: context?.consumoCm2 ?? calculated.consumoCm2,
    areaUsadaCm2: context?.areaUsadaCm2 ?? calculated.areaUsadaCm2,
    desperdicioCm2: context?.desperdicioCm2 ?? calculated.desperdicioCm2,
    areaSobrantesCm2: areaRetazosCm2 > 0 ? areaRetazosCm2 : calculated.areaSobrantesCm2,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildArmadoReportCampos(options: ArmadoReportViewOptions): ArmadoReportCampo[] {
  const { armado, materialLabel, materialAnchoCm, materialAltoCm, cantidadPiezas, context } = options;
  const archivo = armado.archivo_nombre?.trim() || 'Archivo CTA';
  const retazos = context?.retazos ?? [];
  const armadoPor = context?.armadoPor?.trim();
  const stats = resolveUsoMaterialStats(options);

  const base: ArmadoReportCampo[] = [
    { etiqueta: 'Archivo', valor: archivo },
    { etiqueta: materialLabel, valor: `${formatCm(materialAnchoCm)} × ${formatCm(materialAltoCm)} cm` },
    { etiqueta: 'Piezas procesadas', valor: String(cantidadPiezas) },
  ];

  if (stats) {
    base.push(
      { etiqueta: 'Área del material', valor: formatCm2(stats.areaMaterialCm2) },
      {
        etiqueta: 'Uso (suma componentes)',
        valor: `${formatCm2(stats.consumoCm2)} (${stats.porcentajeUso}%)`,
      },
      { etiqueta: 'Área usada (montaje)', valor: formatCm2(stats.areaUsadaCm2) },
    );

    if (stats.areaSobrantesCm2 > 0) {
      base.push({ etiqueta: 'Retazos sobrantes', valor: formatCm2(stats.areaSobrantesCm2) });
    }

    base.push({ etiqueta: 'Desperdicio', valor: formatCm2(stats.desperdicioCm2) });
  } else {
    base.push({
      etiqueta: 'Retazos declarados',
      valor: retazos.length > 0 ? String(retazos.length) : 'Ninguno',
    });
  }

  if (armadoPor) {
    base.unshift({ etiqueta: 'Armado por', valor: armadoPor });
  }

  return [...base, ...(context?.campos ?? [])];
}

function getGraphicSize(maxWidth: number, aspect: number, maxHeight: number): { width: number; height: number } {
  // aspect = ancho / alto de la imagen
  let width = maxWidth;
  let height = width / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  return { width, height };
}

function estimateTableHeight(
  rowCount: number,
  fontSize: number,
  cellPadding: number,
  headRows = 1,
): number {
  const rowHeight = fontSize * 0.35 + cellPadding * 2;
  const headHeight = headRows * (fontSize * 0.38 + cellPadding * 2) + 1;
  return headHeight + rowCount * rowHeight;
}

function fitTableStyle(
  rowCount: number,
  maxHeight: number,
): { fontSize: number; cellPadding: number } {
  for (let fontSize = 7; fontSize >= 5; fontSize -= 0.5) {
    const cellPadding = Math.max(0.6, fontSize * 0.14);
    if (estimateTableHeight(rowCount, fontSize, cellPadding) <= maxHeight) {
      return { fontSize, cellPadding };
    }
  }

  return { fontSize: 5, cellPadding: 0.6 };
}

function splitInColumns<T>(items: T[], columns: number): T[][] {
  if (columns <= 1) return [items];

  const chunkSize = Math.ceil(items.length / columns);
  const chunks: T[][] = [];
  for (let i = 0; i < columns; i++) {
    chunks.push(items.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

function layoutPiezasArea(
  piezas: ArmadoPiezaPreview[],
  maxHeight: number,
): { chunks: ArmadoPiezaPreview[][]; fontSize: number; cellPadding: number } {
  for (let columns = 1; columns <= 2; columns++) {
    const chunks = splitInColumns(piezas, columns);
    const maxRows = Math.max(...chunks.map((chunk) => chunk.length));
    const style = fitTableStyle(maxRows, maxHeight - 6);
    if (estimateTableHeight(maxRows, style.fontSize, style.cellPadding) <= maxHeight - 6) {
      return { chunks, ...style };
    }
  }

  const chunks = splitInColumns(piezas, 2);
  return { chunks, ...fitTableStyle(Math.max(...chunks.map((c) => c.length)), maxHeight - 6) };
}

function buildPiezaRows(
  piezas: ArmadoPiezaPreview[],
  pieceNumber: (pieza: ArmadoPiezaPreview) => number,
): string[][] {
  return piezas.map((pieza) => [
    String(pieceNumber(pieza)),
    pieza.nombre,
    formatCmValue(piezaAnchoCm(pieza)),
    formatCmValue(piezaAltoCm(pieza)),
    formatCmValue(piezaXCm(pieza)),
    formatCmValue(piezaYCm(pieza)),
    `${pieza.angulo ?? 0}°`,
  ]);
}

function drawPiezasTable(
  doc: jsPDF,
  options: {
    startY: number;
    x: number;
    width: number;
    maxBottom: number;
    piezas: ArmadoPiezaPreview[];
    pieceNumber: (pieza: ArmadoPiezaPreview) => number;
    fontSize: number;
    cellPadding: number;
    title?: string;
  },
): number {
  const { startY, x, width, maxBottom, piezas, pieceNumber, fontSize, cellPadding, title } = options;

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(title, x, startY);
  }

  autoTable(doc, {
    startY: title ? startY + 3 : startY,
    margin: { left: x, right: doc.internal.pageSize.getWidth() - x - width, bottom: doc.internal.pageSize.getHeight() - maxBottom },
    tableWidth: width,
    head: [['#', 'Componente', 'An', 'Al', 'X', 'Y', '°']],
    body: buildPiezaRows(piezas, pieceNumber),
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize,
      cellPadding,
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [...SLATE_LIGHT],
      textColor: [...SLATE],
      fontStyle: 'bold',
      fontSize: Math.max(fontSize - 0.5, 5),
      cellPadding,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 11, halign: 'right' },
      3: { cellWidth: 11, halign: 'right' },
      4: { cellWidth: 11, halign: 'right' },
      5: { cellWidth: 11, halign: 'right' },
      6: { cellWidth: 8, halign: 'center' },
    },
  });

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
}

function drawSummaryGrid(
  doc: jsPDF,
  campos: ArmadoReportCampo[],
  x: number,
  y: number,
  width: number,
): number {
  const colWidth = width / SUMMARY_COLS;
  const rowHeight = 8.5;

  campos.forEach((campo, index) => {
    const col = index % SUMMARY_COLS;
    const row = Math.floor(index / SUMMARY_COLS);
    const cellX = x + col * colWidth;
    const lineY = y + row * rowHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(campo.etiqueta.toUpperCase(), cellX, lineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(campo.valor, cellX, lineY + 3.2, { maxWidth: colWidth - 2 });
  });

  const rows = Math.ceil(campos.length / SUMMARY_COLS);
  return y + rows * rowHeight;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo renderizar el gráfico SVG.'));
    img.src = url;
  });
}

async function svgElementToPng(
  svgEl: SVGSVGElement,
): Promise<{ dataUrl: string; aspect: number }> {
  const clone = cloneSvgForExport(svgEl);
  const viewBox = clone.viewBox.baseVal;
  const width = viewBox.width > 0 ? viewBox.width : clone.clientWidth;
  const height = viewBox.height > 0 ? viewBox.height : clone.clientHeight;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspect: width / height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderGraphicToPdf(
  doc: jsPDF,
  graphicElement: HTMLElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
): Promise<number> {
  const liveSvg = graphicElement.querySelector('svg');

  if (liveSvg) {
    try {
      const { dataUrl, aspect } = await svgElementToPng(liveSvg);
      const { width, height } = getGraphicSize(maxWidth, aspect, maxHeight);
      doc.addImage(dataUrl, 'PNG', x + (maxWidth - width) / 2, y, width, height, undefined, 'FAST');
      return height;
    } catch {
      // Fallback a html2canvas si el SVG no se puede rasterizar.
    }
  }

  graphicElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const canvas = await html2canvas(graphicElement, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    backgroundColor: '#f8fafc',
    logging: false,
    useCORS: true,
    allowTaint: true,
    onclone: (clonedDoc) => {
      const clonedWrap = clonedDoc.querySelector('.armado-preview__canvas-wrap') as HTMLElement | null;
      const clonedSvg = clonedDoc.querySelector('.armado-preview__svg') as SVGSVGElement | null;
      if (!clonedWrap || !clonedSvg) return;

      clonedWrap.style.overflow = 'visible';
      clonedWrap.style.height = 'auto';
      clonedWrap.style.minHeight = '0';
      clonedWrap.style.maxHeight = 'none';

      const vb = clonedSvg.viewBox.baseVal;
      const aspect = vb.width > 0 && vb.height > 0 ? vb.width / vb.height : 1;
      const renderWidth = Math.min(960, clonedWrap.clientWidth || 960);
      clonedSvg.style.display = 'block';
      clonedSvg.style.width = `${renderWidth}px`;
      clonedSvg.style.height = `${renderWidth / aspect}px`;
      clonedSvg.style.maxWidth = 'none';
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Empty graphic capture');
  }

  const { width, height } = getGraphicSize(maxWidth, canvas.height / canvas.width, maxHeight);
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', x + (maxWidth - width) / 2, y, width, height, undefined, 'FAST');

  return height;
}

export async function generateArmadoReportPdf(options: ArmadoReportPdfOptions): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const titulo = options.context?.titulo?.trim() || 'Reporte de armado';
  const campos = buildArmadoReportCampos(options);
  const retazos = options.context?.retazos ?? [];

  let y = PAGE_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(titulo, PAGE_MARGIN, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exportado: ${formatGeneratedAt()}`, pageWidth - PAGE_MARGIN, y + 3.5, { align: 'right' });

  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 4;

  y = drawSummaryGrid(doc, campos, PAGE_MARGIN, y, contentWidth) + 4;

  const mainTop = y;
  const mainBottom = pageHeight - PAGE_MARGIN;
  const mainHeight = mainBottom - mainTop;

  const graphicWidth = contentWidth * GRAPHIC_COLUMN_RATIO;
  const tableAreaX = PAGE_MARGIN + graphicWidth + COLUMN_GAP;
  const tableAreaWidth = contentWidth - graphicWidth - COLUMN_GAP;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Diseño en plancha', PAGE_MARGIN, mainTop + 3);

  const graphicY = mainTop + 6;
  const graphicMaxHeight = mainHeight - 8;
  const retazosBlockHeight =
    retazos.length > 0 ? Math.min(28, 10 + estimateTableHeight(retazos.length, 6, 0.8)) : 0;
  const graphicBoxHeight = Math.max(40, graphicMaxHeight - retazosBlockHeight);

  try {
    await renderGraphicToPdf(
      doc,
      options.graphicElement,
      PAGE_MARGIN,
      graphicY,
      graphicWidth,
      graphicBoxHeight,
    );
  } catch {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Gráfico no disponible.', PAGE_MARGIN, graphicY + 8);
  }

  if (retazos.length > 0) {
    const retazosY = mainBottom - retazosBlockHeight + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Retazos (${retazos.length})`, PAGE_MARGIN, retazosY);

    autoTable(doc, {
      startY: retazosY + 2.5,
      margin: { left: PAGE_MARGIN, right: pageWidth - PAGE_MARGIN - graphicWidth, bottom: PAGE_MARGIN },
      tableWidth: graphicWidth,
      head: [['#', 'Código', 'An', 'Al', 'Área']],
      body: retazos.map((retazo, index) => [
        String(index + 1),
        retazo.codigo,
        formatCmValue(retazo.anchoCm),
        formatCmValue(retazo.altoCm),
        formatCmValue(retazo.anchoCm * retazo.altoCm),
      ]),
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 6,
        cellPadding: 0.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [255, 251, 235],
        textColor: [180, 83, 9],
        fontStyle: 'bold',
        fontSize: 5.8,
        cellPadding: 0.8,
      },
      alternateRowStyles: {
        fillColor: [255, 253, 245],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    });
  }

  const piezasLayout = layoutPiezasArea(options.piezas, mainHeight - 4);
  const tableGap = 3;
  const chunkWidth =
    piezasLayout.chunks.length > 1
      ? (tableAreaWidth - tableGap) / piezasLayout.chunks.length
      : tableAreaWidth;

  piezasLayout.chunks.forEach((chunk, index) => {
    const chunkX = tableAreaX + index * (chunkWidth + tableGap);
    const title =
      index === 0
        ? `Componentes (${options.cantidadPiezas})${piezasLayout.chunks.length > 1 ? ` — ${index + 1}/${piezasLayout.chunks.length}` : ''}`
        : `Componentes — ${index + 1}/${piezasLayout.chunks.length}`;

    drawPiezasTable(doc, {
      startY: mainTop,
      x: chunkX,
      width: chunkWidth,
      maxBottom: mainBottom,
      piezas: chunk,
      pieceNumber: options.pieceNumber,
      fontSize: piezasLayout.fontSize,
      cellPadding: piezasLayout.cellPadding,
      title: index === 0 || piezasLayout.chunks.length > 1 ? title : undefined,
    });
  });

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  downloadBlob(new Blob([content], { type: mimeType }), fileName);
}

export function resolveArmadoBaseName(armado: ArmadoImportData, custom?: string | null): string {
  const trimmed = custom?.trim();
  if (trimmed) return trimmed.replace(/\.(svg|html|pdf)$/i, '');

  const archivo = armado.archivo_nombre?.replace(/\.(cta|xls|html|htm)$/i, '').trim();
  return archivo || 'armado-plancha';
}
