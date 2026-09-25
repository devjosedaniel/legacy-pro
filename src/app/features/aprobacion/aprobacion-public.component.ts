import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AprobacionArchivo, AprobacionColor, AprobacionCola } from '../../core/models/aprobacion.model';
import { AprobacionService } from '../../core/services/aprobacion.service';

type ModalId = 'aviso' | 'cambios' | 'cotizacion' | 'prueba' | 'fotopolimero' | null;

@Component({
  selector: 'app-aprobacion-public',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './aprobacion-public.component.html',
  styleUrl: './aprobacion-public.component.scss',
})
export class AprobacionPublicComponent {
  private readonly fb = inject(FormBuilder);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly aprobacionSrv = inject(AprobacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly downloading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly archivo = signal<AprobacionArchivo | null>(null);
  readonly colas = signal<AprobacionCola[]>([]);
  readonly modal = signal<ModalId>(null);
  readonly remainingSeconds = signal(5);
  readonly previewKind = signal<'pdf' | 'image' | 'other'>('other');
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal(false);
  readonly previewFailed = signal(false);
  readonly previewFullscreen = signal(false);
  readonly imageZoom = signal(1);
  readonly imageRotation = signal(0);
  readonly fileBytes = signal<number | null>(null);
  readonly fotoColores = signal<Array<AprobacionColor & { procesar: boolean; digicap: string }>>([]);
  readonly fotoFiles = signal<File[]>([]);

  readonly cambiosForm = this.fb.nonNullable.group({
    sugerencia: ['', Validators.required],
  });
  readonly avisoForm = this.fb.nonNullable.group({
    aviso: [false, Validators.requiredTrue],
  });
  readonly cotizacionForm = this.fb.nonNullable.group({
    observacion: [''],
  });
  readonly pruebaForm = this.fb.nonNullable.group({
    cola_id: [null as number | null, Validators.required],
  });
  readonly fotoForm = this.fb.nonNullable.group({
    informacion: [''],
  });

  cambioFile: File | null = null;
  evidenciaFile: File | null = null;
  private previewObjectUrl: string | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly trabajo = computed(() => this.archivo()?.trabajo ?? null);
  readonly secuenciaLabel = computed(() => {
    const seq = this.trabajo()?.secuencia;
    if (seq == null) return '';
    return `SIS${String(seq).padStart(5, '0')}`;
  });
  readonly yaRespondido = computed(() => !!this.archivo()?.aprobacion);
  readonly aprobado = computed(() => this.archivo()?.aprobacion?.aprobado === 1);
  readonly fechaRegistro = computed(() => {
    const registro = this.archivo()?.aprobacion;
    return this.formatDateTime(
      registro?.created_at || registro?.updated_at || this.trabajo()?.etapa?.fechaaprobacion,
    );
  });
  readonly esCransa = computed(() => this.trabajo()?.es_cransa === 1);
  readonly requiereEvidencia = computed(() => this.esCransa());
  readonly necesitaCotizacion = computed(() => {
    const trabajo = this.trabajo();
    return (
      trabajo?.es_cransa === 1 &&
      trabajo.etapa?.etapa_id === 2 &&
      !trabajo.etapa?.cotizacion_id &&
      trabajo.es_duplicacion === 0
    );
  });
  /** Igual que el Angular 2023: Cransa sin cotización al pendiente; si ya está aprobado, siempre se puede pedir. */
  readonly puedeSolicitarCotizacion = computed(() => {
    const trabajo = this.trabajo();
    if (!trabajo) return false;
    if (!this.yaRespondido()) {
      return trabajo.es_cransa === 1 && !trabajo.etapa?.cotizacion_id;
    }
    return this.aprobado();
  });
  readonly puedePruebaColor = computed(() => {
    const archivo = this.archivo();
    if (!archivo?.aprobacion || archivo.aprobacion.aprobado !== 1) return false;
    if (this.esCransa()) return false;
    if (archivo.aprobacion.pruebacolor === 1 || archivo.aprobacion.fotopolimero === 1) return false;
    const carpeta = (archivo.carpeta ?? '').toLowerCase();
    return carpeta === 'arte' || carpeta === 'cambio';
  });
  readonly puedeFotopolimero = computed(() => {
    const archivo = this.archivo();
    if (!archivo?.aprobacion || archivo.aprobacion.aprobado !== 1) return false;
    if (this.esCransa()) return false;
    return archivo.aprobacion.pruebacolor !== 1 && archivo.aprobacion.fotopolimero !== 1;
  });

  readonly fileTypeLabel = computed(() => this.formatFileType(this.archivo()?.tipo, this.archivo()?.nombre));
  readonly fileSizeLabel = computed(() => this.formatFileSize(this.fileBytes() ?? this.archivo()?.peso));
  readonly imageTransform = computed(
    () => `rotate(${this.imageRotation()}deg) scale(${this.imageZoom()})`,
  );

  constructor() {
    this.title.setTitle('Aprobación de archivo | Legacy Pro');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.previewFullscreen.set(false);
    };
    window.addEventListener('keydown', onKey);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('keydown', onKey);
      this.clearCountdown();
      this.revokePreview();
    });
    this.cargar();
  }

  tokenFromUrl(): string {
    const path = this.router.url.split('?')[0];
    const marker = '/aprobacion/';
    const index = path.indexOf(marker);
    if (index < 0) return '';
    return decodeURIComponent(path.slice(index + marker.length));
  }

  cargar(): void {
    const token = this.tokenFromUrl();
    if (!token) {
      this.loading.set(false);
      this.errorMessage.set('El enlace de aprobación no es válido.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.aprobacionSrv
      .mostrar(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res.archivo) {
            this.errorMessage.set(res.mensaje ?? 'No se encontró el archivo solicitado.');
            return;
          }
          this.archivo.set(res.archivo);
          this.colas.set(res.caracteristicas?.colas ?? []);
          this.prepararPreview(res.archivo);
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  abrirAviso(): void {
    if (this.necesitaCotizacion()) {
      this.errorMessage.set(
        'Necesita solicitar y recibir una cotización actualizada antes de aprobar este cambio.',
      );
      return;
    }
    this.avisoForm.reset({ aviso: false });
    this.evidenciaFile = null;
    this.remainingSeconds.set(5);
    this.modal.set('aviso');
    this.clearCountdown();
    this.countdownTimer = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      this.remainingSeconds.set(Math.max(0, next));
      if (next <= 0) this.clearCountdown();
    }, 1000);
  }

  abrirCambios(): void {
    this.cambiosForm.reset({ sugerencia: '' });
    this.cambioFile = null;
    this.modal.set('cambios');
  }

  abrirCotizacion(): void {
    this.cotizacionForm.reset({ observacion: '' });
    this.modal.set('cotizacion');
  }

  abrirPruebaColor(): void {
    if (this.colas().length === 0) {
      this.errorMessage.set('No se encontraron colas de prueba de color.');
      return;
    }
    this.pruebaForm.reset({ cola_id: null });
    this.modal.set('prueba');
  }

  abrirFotopolimero(): void {
    const colores = this.trabajo()?.colores ?? [];
    this.fotoColores.set(
      colores.map((color) => ({
        ...color,
        procesar: color.procesar === 1 || color.procesar === true,
        digicap: color.digicap ?? '',
      })),
    );
    this.fotoFiles.set([]);
    this.fotoForm.reset({ informacion: '' });
    this.modal.set('fotopolimero');
  }

  cerrarModal(): void {
    this.modal.set(null);
    this.clearCountdown();
  }

  onCambioFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.cambioFile = input.files?.[0] ?? null;
  }

  onEvidenciaFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.evidenciaFile = input.files?.[0] ?? null;
  }

  onFotoFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const valid = files.filter((file) => file.size / 1024 / 1024 <= 200);
    if (valid.length !== files.length) {
      this.errorMessage.set('Cada archivo debe pesar menos de 200 MB.');
    }
    this.fotoFiles.set(valid);
  }

  toggleColor(index: number): void {
    this.fotoColores.update((list) =>
      list.map((item, i) => (i === index ? { ...item, procesar: !item.procesar } : item)),
    );
  }

  onDigicapInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.fotoColores.update((list) =>
      list.map((item, i) => (i === index ? { ...item, digicap: value } : item)),
    );
  }

  aprobar(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    if (this.avisoForm.invalid || this.remainingSeconds() > 0) {
      this.avisoForm.markAllAsTouched();
      return;
    }
    if (this.requiereEvidencia() && !this.evidenciaFile) {
      this.errorMessage.set('Suba un archivo de evidencia de aprobación.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const request$ =
      this.requiereEvidencia() && this.evidenciaFile
        ? this.aprobacionSrv.aprobarDigitalConArchivo(archivo.id, this.evidenciaFile)
        : this.aprobacionSrv.aprobarDigital(archivo.id);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.cerrarModal();
        if (res.archivo) this.archivo.set(res.archivo);
        this.successMessage.set(res.mensaje ?? 'Trabajo aprobado correctamente.');
      },
      error: (err: Error) => {
        this.submitting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  enviarCambios(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    if (this.cambiosForm.invalid) {
      this.cambiosForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.aprobacionSrv
      .registrarCambios(archivo.id, this.cambiosForm.controls.sugerencia.value, this.cambioFile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.cerrarModal();
          if (res.archivo) this.archivo.set(res.archivo);
          this.successMessage.set(res.mensaje ?? 'Cambios registrados correctamente.');
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  enviarCotizacion(): void {
    const trabajo = this.trabajo();
    if (!trabajo) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.aprobacionSrv
      .solicitarCotizacion(trabajo.id, this.cotizacionForm.controls.observacion.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.cerrarModal();
          this.successMessage.set(res.mensaje ?? 'Solicitud de cotización enviada.');
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  enviarPruebaColor(): void {
    const archivo = this.archivo();
    const colaId = this.pruebaForm.controls.cola_id.value;
    if (!archivo || colaId == null) {
      this.pruebaForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.aprobacionSrv
      .solicitarPruebaColor(archivo.id, colaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.cerrarModal();
          if (res.archivo) this.archivo.set(res.archivo);
          this.successMessage.set(res.mensaje ?? 'Solicitud de prueba de color enviada.');
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  enviarFotopolimero(): void {
    const archivo = this.archivo();
    if (!archivo) return;
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.aprobacionSrv
      .solicitarFotopolimero(archivo.id, {
        informacion: this.fotoForm.controls.informacion.value,
        colores: this.fotoColores().map((color) => ({
          id: color.id,
          procesar: color.procesar ? 1 : 0,
          digicap: color.digicap || null,
        })),
        files: this.fotoFiles(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.cerrarModal();
          if (res.archivo) this.archivo.set(res.archivo);
          this.successMessage.set(res.mensaje ?? 'Solicitud de fotopolímero enviada.');
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  descargar(): void {
    const token = this.tokenFromUrl();
    const archivo = this.archivo();
    if (!token || !archivo) return;
    this.downloading.set(true);
    this.aprobacionSrv
      .descargarSeguro(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.downloading.set(false);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = archivo.nombre;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (err: Error) => {
          this.downloading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  dato(value: unknown): string {
    if (value == null || value === '') return '—';
    return String(value);
  }

  abrirEnPestana(): void {
    if (!this.previewObjectUrl) return;
    window.open(this.previewObjectUrl, '_blank', 'noopener');
  }

  abrirPantallaCompleta(): void {
    if (!this.previewUrl()) return;
    this.previewFullscreen.set(true);
  }

  cerrarPantallaCompleta(): void {
    this.previewFullscreen.set(false);
  }

  zoomImagen(delta: number): void {
    const next = Math.min(3, Math.max(0.5, +(this.imageZoom() + delta).toFixed(2)));
    this.imageZoom.set(next);
  }

  resetImagen(): void {
    this.imageZoom.set(1);
    this.imageRotation.set(0);
  }

  rotarImagen(): void {
    this.imageRotation.update((value) => (value + 90) % 360);
  }

  marcarPdfFallido(): void {
    this.previewFailed.set(true);
  }

  formatFileType(tipo?: string | null, nombre?: string | null): string {
    const mime = (tipo ?? '').toLowerCase();
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('webp')) return 'WEBP';
    if (mime.startsWith('image/')) return mime.replace('image/', '').toUpperCase();
    const ext = nombre?.split('.').pop()?.toUpperCase();
    return ext || 'Archivo';
  }

  formatFileSize(bytes?: number | string | null): string {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return '—';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private prepararPreview(archivo: AprobacionArchivo): void {
    const type = (archivo.tipo ?? '').toLowerCase();
    const name = (archivo.nombre ?? '').toLowerCase();
    this.previewFailed.set(false);
    this.previewLoading.set(true);
    this.imageZoom.set(1);
    this.imageRotation.set(0);
    this.fileBytes.set(archivo.peso != null ? Number(archivo.peso) : null);

    if (type.includes('pdf') || name.endsWith('.pdf')) {
      this.previewKind.set('pdf');
    } else if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) {
      this.previewKind.set('image');
    } else {
      this.previewKind.set('other');
      this.previewLoading.set(false);
      return;
    }

    this.aprobacionSrv
      .descargarSeguro(this.tokenFromUrl())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.previewLoading.set(false);
          this.fileBytes.set(blob.size);
          this.revokePreview();
          const previewBlob =
            this.previewKind() === 'pdf' && !blob.type.includes('pdf')
              ? new Blob([blob], { type: 'application/pdf' })
              : blob;
          this.previewObjectUrl = URL.createObjectURL(previewBlob);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl));
        },
        error: () => {
          this.previewLoading.set(false);
          this.previewFailed.set(true);
        },
      });
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewUrl.set(null);
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
