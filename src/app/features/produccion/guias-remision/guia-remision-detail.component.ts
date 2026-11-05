import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuiaRemisionDetalle } from '../../../core/models/guia-remision.model';
import { GuiaRemisionService } from '../../../core/services/guia-remision.service';
import { sriBadgeClass, sriEstadoLabel } from '../../../core/utils/sri.util';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-guia-remision-detail',
  imports: [RouterLink, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './guia-remision-detail.component.html',
  styleUrl: './guia-remision-detail.component.scss',
})
export class GuiaRemisionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly guiaService = inject(GuiaRemisionService);
  private readonly fb = inject(FormBuilder);

  protected readonly listRoute = '/dashboard/produccion/guias-remision';
  protected readonly sriBadgeClass = sriBadgeClass;
  protected readonly sriEstadoLabel = sriEstadoLabel;
  protected readonly guia = signal<GuiaRemisionDetalle | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly confirmAnularOpen = signal(false);
  protected readonly anularLoading = signal(false);
  protected readonly enviando = signal(false);
  protected readonly generando = signal(false);
  protected readonly editandoHoja = signal(false);
  protected readonly guardandoHoja = signal(false);

  protected readonly hojaForm = this.fb.nonNullable.group({
    lineatura: ['', Validators.required],
    reposo: ['', Validators.required],
    shorea: ['', Validators.required],
    alturarelieve: ['', Validators.required],
    espesorpiso: ['', Validators.required],
    espesorrelieve: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage.set('Guía no válida.');
      this.isLoading.set(false);
      return;
    }
    this.cargar(id);
  }

  protected pdfUrl(id: number): string {
    return this.guiaService.pdfUrl(id);
  }

  protected certificadoUrl(id: number): string {
    return this.guiaService.certificadoUrl(id);
  }

  protected pdfRideUrl(id: number): string {
    return this.guiaService.pdfRideUrl(id);
  }

  protected previewUrl(id: number): string {
    return this.guiaService.previewUrl(id);
  }

  protected formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected display(value?: string | number | null): string {
    if (value == null || value === '') return '—';
    return String(value);
  }

  protected pedirAnular(): void {
    this.confirmAnularOpen.set(true);
  }

  protected cancelarAnular(): void {
    if (this.anularLoading()) return;
    this.confirmAnularOpen.set(false);
  }

  protected confirmarAnular(): void {
    const guia = this.guia();
    if (!guia) return;
    this.anularLoading.set(true);
    this.errorMessage.set(null);
    this.guiaService.anular(guia.id).subscribe({
      next: (mensaje) => {
        this.anularLoading.set(false);
        this.confirmAnularOpen.set(false);
        this.successMessage.set(mensaje);
        this.cargar(guia.id);
      },
      error: (err: Error) => {
        this.anularLoading.set(false);
        this.confirmAnularOpen.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected enviar(): void {
    const guia = this.guia();
    if (!guia) return;
    this.enviando.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.guiaService.enviar(guia.id).subscribe({
      next: (mensaje) => {
        this.enviando.set(false);
        this.successMessage.set(mensaje);
      },
      error: (err: Error) => {
        this.enviando.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected generar(): void {
    const guia = this.guia();
    if (!guia) return;
    this.generando.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.guiaService.generar(guia.id).subscribe({
      next: (mensaje) => {
        this.generando.set(false);
        this.successMessage.set(mensaje);
        this.cargar(guia.id);
      },
      error: (err: Error) => {
        this.generando.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected editarHoja(): void {
    const guia = this.guia();
    if (!guia) return;
    this.hojaForm.reset({
      lineatura: guia.lineatura ?? '',
      reposo: guia.reposo ?? '',
      shorea: guia.shorea ?? '',
      alturarelieve: guia.alturaRelieve ?? '',
      espesorpiso: guia.espesorPiso ?? '',
      espesorrelieve: guia.espesorRelieve ?? '',
    });
    this.editandoHoja.set(true);
  }

  protected cancelarHoja(): void {
    this.editandoHoja.set(false);
  }

  protected guardarHoja(): void {
    const guia = this.guia();
    if (!guia) return;
    if (this.hojaForm.invalid) {
      this.hojaForm.markAllAsTouched();
      return;
    }
    this.guardandoHoja.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.guiaService.actualizarHojaSeguridad(guia.id, this.hojaForm.getRawValue()).subscribe({
      next: (mensaje) => {
        this.guardandoHoja.set(false);
        this.editandoHoja.set(false);
        this.successMessage.set(mensaje);
        this.cargar(guia.id);
      },
      error: (err: Error) => {
        this.guardandoHoja.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private cargar(id: number): void {
    this.isLoading.set(true);
    this.guiaService.getById(id).subscribe({
      next: (guia) => {
        this.guia.set(guia);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.isLoading.set(false);
      },
    });
  }
}
