import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReporteService } from '../../../core/services/reporte.service';

type PeriodMode = 'actual' | 'mes_anterior' | 'mes_especifico';

@Component({
  selector: 'app-reportes-home',
  imports: [RouterLink],
  templateUrl: './reportes-home.component.html',
  styleUrl: './reportes-home.component.scss',
})
export class ReportesHomeComponent {
  private readonly reporteService = inject(ReporteService);

  protected readonly isDownloading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly periodMode = signal<PeriodMode>('actual');
  protected readonly selectedMonth = signal(this.defaultMonthInput());

  protected readonly maxMonth = computed(() => this.formatMonthInput(new Date()));

  protected readonly mesAnteriorLabel = computed(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  });

  protected onPeriodModeChange(value: string): void {
    this.periodMode.set(value as PeriodMode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected onMonthChange(value: string): void {
    this.selectedMonth.set(value);
  }

  protected useMesAnterior(): void {
    this.periodMode.set('mes_anterior');
    this.selectedMonth.set(this.previousMonthInput());
    this.downloadInventario();
  }

  protected downloadInventario(): void {
    const mode = this.periodMode();
    let mes: string | undefined;

    if (mode === 'mes_anterior') {
      mes = this.previousMonthInput();
    } else if (mode === 'mes_especifico') {
      const picked = this.selectedMonth();
      if (!picked) {
        this.errorMessage.set('Selecciona un mes.');
        return;
      }
      if (picked > this.maxMonth()) {
        this.errorMessage.set('No puedes elegir un mes futuro.');
        return;
      }
      mes = picked;
    }

    this.isDownloading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.reporteService.downloadInventarioPdf(mes).subscribe({
      next: (blob) => {
        const filename =
          mes != null ? `inventario-${mes}.pdf` : `inventario-${new Date().toISOString().slice(0, 10)}.pdf`;
        this.reporteService.saveBlob(blob, filename);
        this.isDownloading.set(false);
        this.successMessage.set(
          mes != null
            ? `PDF del cierre de ${this.formatMonthLabel(mes)} descargado.`
            : 'PDF del inventario actual descargado.',
        );
      },
      error: (err: Error) => {
        this.isDownloading.set(false);
        this.errorMessage.set(err.message ?? 'No se pudo descargar el reporte.');
      },
    });
  }

  private defaultMonthInput(): string {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return this.formatMonthInput(d);
  }

  private previousMonthInput(): string {
    return this.defaultMonthInput();
  }

  private formatMonthInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private formatMonthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
}
