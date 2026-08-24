import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReporteService } from '../../../core/services/reporte.service';
import { RetazosDisponiblesReporte } from '../../../core/models/reporte.model';

@Component({
  selector: 'app-retazos-disponibles-report',
  imports: [RouterLink],
  templateUrl: './retazos-disponibles-report.component.html',
  styleUrl: './retazos-disponibles-report.component.scss',
})
export class RetazosDisponiblesReportComponent implements OnInit {
  private readonly reporteService = inject(ReporteService);

  protected readonly loading = signal(true);
  protected readonly downloadingPdf = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly reporte = signal<RetazosDisponiblesReporte | null>(null);

  ngOnInit(): void {
    this.loadReporte();
  }

  protected reload(): void {
    this.loadReporte();
  }

  protected downloadPdf(): void {
    this.downloadingPdf.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.reporteService.downloadRetazosDisponiblesPdf().subscribe({
      next: (blob) => {
        const filename = `retazos-disponibles-${new Date().toISOString().slice(0, 10)}.pdf`;
        this.reporteService.saveBlob(blob, filename);
        this.downloadingPdf.set(false);
        this.successMessage.set('PDF descargado.');
      },
      error: (err: Error) => {
        this.downloadingPdf.set(false);
        this.errorMessage.set(err.message ?? 'No se pudo descargar el PDF.');
      },
    });
  }

  protected formatArea(value: number): string {
    return `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} cm²`;
  }

  private loadReporte(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.reporteService.fetchRetazosDisponibles().subscribe({
      next: (data) => {
        this.reporte.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message ?? 'No se pudo cargar el reporte.');
      },
    });
  }
}
