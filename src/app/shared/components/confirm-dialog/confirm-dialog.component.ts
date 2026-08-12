import { Component, input, output } from '@angular/core';

export type ConfirmDialogVariant = 'danger' | 'default';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar acción');
  readonly message = input('');
  readonly highlight = input<string | null>(null);
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly variant = input<ConfirmDialogVariant>('default');
  readonly loading = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-dialog')) {
      this.cancelled.emit();
    }
  }

  protected onCancel(): void {
    if (this.loading()) return;
    this.cancelled.emit();
  }

  protected onConfirm(): void {
    if (this.loading()) return;
    this.confirmed.emit();
  }
}
