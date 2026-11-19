import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SriRecibidoService } from '../../../core/services/sri-recibido.service';

@Component({
  selector: 'app-sri-recibido-import',
  imports: [RouterLink],
  templateUrl: './sri-recibido-import.component.html',
  styleUrl: './sri-recibido-import.component.scss',
})
export class SriRecibidoImportComponent {
  private readonly api = inject(SriRecibidoService);
  private readonly router = inject(Router);

  protected readonly claves = signal('');
  protected readonly fileName = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private archivo: File | null = null;

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.archivo = file;
    this.fileName.set(file ? file.name : '');
  }

  protected importar(): void {
    if (this.saving()) return;
    if (!this.claves().trim() && !this.archivo) {
      this.errorMessage.set('Pega al menos una clave de 49 dígitos o sube el archivo del SRI.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.api.importar(this.claves().trim(), this.archivo).subscribe({
      next: (mensaje) => {
        this.saving.set(false);
        void this.router.navigate(['/dashboard/contabilidad/recibidos'], {
          state: { successMessage: mensaje, consultar: true },
        });
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
