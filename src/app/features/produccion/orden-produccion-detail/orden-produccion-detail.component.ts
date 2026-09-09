import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdenProduccionDetalle } from '../../../core/models/orden-produccion.model';
import { OrdenProduccionService } from '../../../core/services/orden-produccion.service';
import { urgenciaLabel } from '../../../core/utils/urgencia.util';

@Component({
  selector: 'app-orden-produccion-detail',
  imports: [RouterLink],
  templateUrl: './orden-produccion-detail.component.html',
  styleUrl: './orden-produccion-detail.component.scss',
})
export class OrdenProduccionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordenService = inject(OrdenProduccionService);

  protected readonly orden = signal<OrdenProduccionDetalle | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly urgenciaLabel = urgenciaLabel;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage.set('Orden no válida.');
      this.isLoading.set(false);
      return;
    }

    this.ordenService.getById(id).subscribe({
      next: (orden) => {
        this.orden.set(orden);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  protected formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatMedidas(ancho?: number, alto?: number): string {
    if (ancho == null || alto == null) return '—';
    return `${ancho} × ${alto} cm`;
  }

  protected formatSiNo(value?: boolean | null): string {
    if (value == null) return '—';
    return value ? 'Sí' : 'No';
  }

  protected display(value?: string | number | null): string {
    if (value == null || value === '') return '—';
    return String(value);
  }
}
