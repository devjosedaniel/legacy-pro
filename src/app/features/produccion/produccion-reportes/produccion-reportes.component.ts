import { Component, computed, inject, signal } from '@angular/core';
import { ReporteService } from '../../../core/services/reporte.service';

type PeriodMode = 'mes_actual' | 'mes_especifico';

@Component({
  selector: 'app-produccion-reportes',
  templateUrl: './produccion-reportes.component.html',
  styleUrl: './produccion-reportes.component.scss',
})
export class ProduccionReportesComponent {
  private readonly reporteService = inject(ReporteService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isDownloading = signal(false);

  protected readonly period = signal<PeriodMode>('mes_actual');
  protected readonly selectedMonth = signal(this.currentMonthInput());

  protected readonly maxMonth = computed(() => this.currentMonthInput());
  protected readonly mesActualLabel = computed(() => this.formatMonthLabel(this.currentMonthInput()));

  protected onPeriodChange(value: string): void {
    this.period.set(value as PeriodMode);
    this.clearMessages();
  }

  protected onMonthChange(value: string): void {
    this.selectedMonth.set(value);
  }

  protected download(): void {
    const mes = this.period() === 'mes_especifico' ? this.selectedMonth() : this.currentMonthInput();

    if (!mes) {
      this.errorMessage.set('Selecciona un mes.');
      return;
    }
    if (mes > this.maxMonth()) {
      this.errorMessage.set('No puedes elegir un mes futuro.');
      return;
    }

    this.isDownloading.set(true);
    this.clearMessages();

    this.reporteService.downloadConsumoDesperdicioPdf(mes).subscribe({
      next: (blob) => {
        this.reporteService.saveBlob(blob, `consumo-desperdicio-${mes}.pdf`);
        this.isDownloading.set(false);
        this.successMessage.set(`PDF de consumo y desperdicio de ${this.formatMonthLabel(mes)} descargado.`);
      },
      error: (err: Error) => {
        this.isDownloading.set(false);
        this.errorMessage.set(err.message ?? 'No se pudo descargar el reporte.');
      },
    });
  }

  private currentMonthInput(): string {
    return this.formatMonthInput(new Date());
  }

  private formatMonthInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatMonthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
