import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Transferencia } from '../../../core/models/transferencia.model';
import { TransferenciaService } from '../../../core/services/transferencia.service';

@Component({
  selector: 'app-transferencia-detail',
  imports: [RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './transferencia-detail.component.html',
  styleUrl: './transferencia-detail.component.scss',
})
export class TransferenciaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly transferenciaService = inject(TransferenciaService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly item = signal<Transferencia | null>(null);
  protected readonly showAnular = signal(false);
  protected readonly anulating = signal(false);
  protected motivoAnula = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('Transferencia no válida.');
      return;
    }
    this.transferenciaService.getById(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected confirmarAnular(): void {
    const item = this.item();
    const motivo = this.motivoAnula.trim();
    if (!item) return;
    if (motivo.length < 5) {
      this.errorMessage.set('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    this.anulating.set(true);
    this.transferenciaService.anular(item.id, motivo).subscribe({
      next: (mensaje) => {
        this.anulating.set(false);
        this.showAnular.set(false);
        this.successMessage.set(mensaje);
        this.item.update((current) =>
          current ? { ...current, activo: false, motivoAnula: motivo } : current,
        );
      },
      error: (err: Error) => {
        this.anulating.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
