import { Component, computed, input, output } from '@angular/core';
import { pageRangeEnd, pageRangeStart, totalPages } from '../../../core/models/pagination.model';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly page = input(1);
  readonly pageSize = input(25);
  readonly total = input(0);
  readonly disabled = input(false);

  readonly pageChange = output<number>();

  protected readonly totalPages = computed(() => totalPages(this.total(), this.pageSize()));
  protected readonly rangeStart = computed(() => pageRangeStart(this.page(), this.pageSize(), this.total()));
  protected readonly rangeEnd = computed(() => pageRangeEnd(this.page(), this.pageSize(), this.total()));

  protected goTo(page: number): void {
    if (this.disabled()) return;
    const max = this.totalPages();
    if (max === 0) return;
    const next = Math.min(Math.max(1, page), max);
    if (next !== this.page()) {
      this.pageChange.emit(next);
    }
  }
}
