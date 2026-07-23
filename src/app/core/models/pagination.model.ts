export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function totalPages(total: number, pageSize: number): number {
  if (pageSize <= 0 || total <= 0) return total === 0 ? 0 : 1;
  return Math.ceil(total / pageSize);
}

export function pageRangeStart(page: number, pageSize: number, total: number): number {
  if (total === 0) return 0;
  return (page - 1) * pageSize + 1;
}

export function pageRangeEnd(page: number, pageSize: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(page * pageSize, total);
}
