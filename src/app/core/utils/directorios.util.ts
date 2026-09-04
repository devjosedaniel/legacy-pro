export function parseDirectorios(value: unknown): number[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(';')
      : [];

  const ids = raw
    .map((item) => Number(String(item).trim()))
    .filter((id) => Number.isFinite(id) && id > 0);

  return [...new Set(ids)];
}

export function countDirectorios(value: unknown): number {
  return parseDirectorios(value).length;
}
