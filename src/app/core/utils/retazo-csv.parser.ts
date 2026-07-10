import { RetazoCargaRow } from '../models/retazo.model';

export interface CsvParseResult {
  rows: RetazoCargaRow[];
  errores: { linea: number; mensaje: string }[];
}

export function parseRetazosCsv(text: string): CsvParseResult {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows: RetazoCargaRow[] = [];
  const errores: { linea: number; mensaje: string }[] = [];

  if (lines.length === 0) {
    return { rows, errores: [{ linea: 0, mensaje: 'El archivo está vacío.' }] };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const firstCells = splitCsvLine(lines[0], delimiter).map((c) => c.toLowerCase().trim());
  const hasHeader = firstCells.includes('sku') || firstCells.includes('ancho');

  const startIndex = hasHeader ? 1 : 0;
  const columnMap = hasHeader ? mapColumns(firstCells) : defaultColumns();

  for (let i = startIndex; i < lines.length; i++) {
    const linea = i + 1;
    const cells = splitCsvLine(lines[i], delimiter);

    const sku = getCell(cells, columnMap['sku'])?.trim().toUpperCase();
    const anchoRaw = getCell(cells, columnMap['ancho']);
    const altoRaw = getCell(cells, columnMap['alto']);
    const codigo = getCell(cells, columnMap['codigo'])?.trim().toUpperCase();
    const notas = getCell(cells, columnMap['notas'])?.trim();

    if (!sku) {
      errores.push({ linea, mensaje: 'Falta el SKU del producto.' });
      continue;
    }

    const ancho = parseNumber(anchoRaw);
    const alto = parseNumber(altoRaw);

    if (ancho == null || alto == null) {
      errores.push({ linea, mensaje: 'Ancho y alto deben ser números válidos.' });
      continue;
    }

    rows.push({
      sku,
      ancho,
      alto,
      codigo: codigo || undefined,
      notas: notas || undefined,
    });
  }

  return { rows, errores };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function mapColumns(headers: string[]): Record<string, number> {
  const find = (names: string[]) => headers.findIndex((h) => names.includes(h));

  return {
    codigo: find(['codigo', 'código', 'code']),
    sku: find(['sku', 'producto_sku', 'producto']),
    ancho: find(['ancho', 'width']),
    alto: find(['alto', 'height', 'largo']),
    notas: find(['notas', 'observaciones', 'comentario']),
  };
}

function defaultColumns(): Record<string, number> {
  return { codigo: 0, sku: 1, ancho: 2, alto: 3, notas: 4 };
}

function getCell(cells: string[], index: number): string | undefined {
  if (index < 0 || index >= cells.length) return undefined;
  const value = cells[index]?.trim();
  return value || undefined;
}

function parseNumber(value?: string): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}
