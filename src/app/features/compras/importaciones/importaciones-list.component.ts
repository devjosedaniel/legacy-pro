import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Importacion, padImportacionSecuencia } from '../../../core/models/importacion.model';
import { ImportacionService } from '../../../core/services/importacion.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-importaciones-list',
  imports: [RouterLink, CurrencyPipe, PaginationComponent, ConfirmDialogComponent],
  templateUrl: './importaciones-list.component.html',
  styleUrl: './importaciones-list.component.scss',
})
export class ImportacionesListComponent implements OnInit {
  private readonly api = inject(ImportacionService);

  protected readonly pad = padImportacionSecuencia;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly downloadingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly items = signal<Importacion[]>([]);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly pendingDelete = signal<Importacion | null>(null);

  ngOnInit(): void {
    const message = (history.state as { successMessage?: string } | null)?.successMessage;
    if (message) {
      this.successMessage.set(message);
      history.replaceState({ ...history.state, successMessage: undefined }, '');
      setTimeout(() => this.successMessage.set(null), 4000);
    }
    this.cargar(1);
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected buscar(): void {
    this.cargar(1);
  }

  protected cargar(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.page.set(page);
    this.api
      .list({ limite: this.pageSize, pagina: page, busqueda: this.search().trim() })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected confirmDelete(item: Importacion): void {
    this.pendingDelete.set(item);
    this.confirmOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const item = this.pendingDelete();
    if (!item) return;
    this.confirmLoading.set(true);
    this.api.delete(item.id).subscribe({
      next: (mensaje) => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        this.successMessage.set(mensaje);
        this.cargar(this.page());
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: Error) => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onCancelDelete(): void {
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected downloadPdf(item: Importacion): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(item.id);
    this.api.downloadPdf(item.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `importacion-${this.pad(item.secuencia)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloadingId.set(null);
      },
      error: (err: Error) => {
        this.downloadingId.set(null);
        this.errorMessage.set(err.message);
      },
    });
  }

}
