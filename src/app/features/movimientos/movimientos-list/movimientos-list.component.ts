import { KeyValuePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { ProductCategorySlug } from '../../../core/models/category.model';
import {
  isMovimientoAnulado,
  MOVEMENT_LABELS,
  Movement,
  MovementDirection,
  MovementEstadoFiltro,
  MovementType,
  StockTipo,
} from '../../../core/models/movement.model';
import { ConsumoConsignacionResumen, MovementService } from '../../../core/services/movement.service';
import { ReporteService } from '../../../core/services/reporte.service';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { formatMovimientoStockOrigen } from '../../../core/utils/stock-tipo.util';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select/search-select.component';

const PAGE_SIZE = 25;

interface PendingConfirmAction {
  title: string;
  message: string;
  highlight: string;
  confirmLabel: string;
  run: () => void;
}

@Component({
  selector: 'app-movimientos-list',
  imports: [RouterLink, KeyValuePipe, ReactiveFormsModule, PaginationComponent, ConfirmDialogComponent, SearchSelectComponent],
  templateUrl: './movimientos-list.component.html',
  styleUrl: './movimientos-list.component.scss',
})
export class MovimientosListComponent implements OnInit {
  private readonly movementService = inject(MovementService);
  private readonly reporteService = inject(ReporteService);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();
  protected readonly productFilterControl = new FormControl('', { nonNullable: true });

  protected readonly movementLabels = MOVEMENT_LABELS;
  protected readonly categories = this.categoryService.getActive();
  protected readonly pageSize = PAGE_SIZE;
  protected readonly formatStockOrigen = formatMovimientoStockOrigen;

  protected readonly search = signal('');
  protected readonly direccionFilter = signal<MovementDirection | 'all'>('all');
  protected readonly tipoFilter = signal<MovementType | 'all'>('all');
  protected readonly categoryFilter = signal<ProductCategorySlug | 'all'>('all');
  protected readonly stockTipoFilter = signal<StockTipo | 'all'>('all');
  protected readonly estadoFilter = signal<MovementEstadoFiltro>('activos');
  protected readonly anulacionHorasLimite = signal(72);

  protected readonly movements = signal<Movement[]>([]);
  protected readonly visibleMovements = computed(() =>
    this.filterMovementsForEstado(this.movements(), this.estadoFilter()),
  );
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly annullingId = signal<string | null>(null);
  protected readonly annullingGrupoId = signal<string | null>(null);
  protected readonly downloadingGrupoId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly confirmTitle = signal('');
  protected readonly confirmMessage = signal('');
  protected readonly confirmHighlight = signal('');
  protected readonly confirmLabel = signal('Confirmar');
  private pendingConfirm: PendingConfirmAction | null = null;
  protected readonly totalSubidas = signal(0);
  protected readonly totalBajadas = signal(0);
  protected readonly consumoConsignacion = signal<ConsumoConsignacionResumen | null>(null);

  protected readonly productFilterOptions = computed((): SearchSelectOption[] => {
    const category = this.categoryFilter();
    return this.productService
      .all()
      .filter((product) => product.activo && (category === 'all' || product.categorySlug === category))
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((product) => ({
        value: product.id,
        label: product.nombre,
        hint: product.sku || undefined,
      }));
  });

  ngOnInit(): void {
    this.productService.ensureLoaded().subscribe();

    this.productFilterControl.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.reload$.next();
      });

    this.reload$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPage(this.page()));

    this.loadSummaryCounts();
    this.loadConsumoConsignacion();
    this.reload$.next();
  }

  protected onEstadoFilterChange(value: string): void {
    this.estadoFilter.set(value as MovementEstadoFiltro);
    this.page.set(1);
    this.reload$.next();
  }

  protected isAnuladosView(): boolean {
    return this.estadoFilter() === 'anulados';
  }

  protected isAnuladoReal(movement: Movement): boolean {
    return isMovimientoAnulado(movement);
  }

  protected canAnular(movement: Movement): boolean {
    return movement.activo && movement.puedeAnular;
  }

  protected plazoAnulacionLabel(): string {
    const horas = this.anulacionHorasLimite();
    if (horas <= 0) return '';
    if (horas < 24) {
      return `Puedes anular movimientos hasta ${horas} horas después de registrarlos.`;
    }
    const dias = Math.round(horas / 24);
    return `Puedes anular movimientos hasta ${dias} día${dias !== 1 ? 's' : ''} (${horas} h) después de registrarlos.`;
  }

  protected onSearchInput(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.reload$.next();
  }

  protected onDireccionChange(value: string): void {
    this.direccionFilter.set(value as MovementDirection | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected onTipoChange(value: string): void {
    this.tipoFilter.set(value as MovementType | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected onCategoryChange(value: string): void {
    this.categoryFilter.set(value as ProductCategorySlug | 'all');
    this.syncProductFilterWithCategory();
    this.page.set(1);
    this.reload$.next();
  }

  protected onStockTipoChange(value: string): void {
    this.stockTipoFilter.set(value as StockTipo | 'all');
    this.page.set(1);
    this.reload$.next();
  }

  protected applyConsumoConsignacionFilter(): void {
    this.direccionFilter.set('bajada');
    this.tipoFilter.set('salida_uso');
    this.stockTipoFilter.set('consignacion');
    this.page.set(1);
    this.reload$.next();
  }

  protected onPageChange(next: number): void {
    this.loadPage(next);
  }

  protected getProductName(movement: Movement): string {
    return this.productService.getById(movement.productId)?.nombre ?? '—';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.productFilterControl.setValue('', { emitEvent: false });
    this.direccionFilter.set('all');
    this.tipoFilter.set('all');
    this.categoryFilter.set('all');
    this.stockTipoFilter.set('all');
    this.estadoFilter.set('activos');
    this.page.set(1);
    this.reload$.next();
  }

  protected isConsignacionFilterActive(): boolean {
    return (
      this.stockTipoFilter() === 'consignacion' &&
      this.tipoFilter() === 'salida_uso' &&
      this.direccionFilter() === 'bajada'
    );
  }

  protected showIngresoLabel(movement: Movement, index: number): boolean {
    if (!movement.ingresoNumero) return false;
    const items = this.visibleMovements();
    const prev = index > 0 ? items[index - 1] : null;
    return !prev || prev.ingresoNumero !== movement.ingresoNumero || prev.grupoId !== movement.grupoId;
  }

  protected downloadIngresoPdf(movement: Movement): void {
    if (!movement.grupoId) return;

    this.actionError.set(null);
    this.downloadingGrupoId.set(movement.grupoId);

    this.reporteService.downloadIngresoKardexPdf(movement.grupoId).subscribe({
      next: (blob) => {
        const label = movement.ingresoNumero ?? movement.grupoId;
        this.reporteService.saveBlob(blob, `kardex-${label}.pdf`);
        this.actionMessage.set(`Kardex del ingreso ${label} descargado.`);
        this.downloadingGrupoId.set(null);
      },
      error: (err: Error) => {
        this.actionError.set(err.message);
        this.downloadingGrupoId.set(null);
      },
    });
  }

  protected confirmAnular(movement: Movement): void {
    const highlight = movement.ingresoNumero
      ? `${movement.numero} · Ingreso ${movement.ingresoNumero}`
      : movement.numero;

    this.openConfirm({
      title: 'Anular movimiento',
      message: 'Se revertirá el stock asociado a este movimiento. Esta acción no se puede deshacer.',
      highlight,
      confirmLabel: 'Sí, anular',
      run: () => this.executeAnular(movement),
    });
  }

  protected confirmAnularIngreso(movement: Movement): void {
    if (!movement.grupoId) return;
    const label = movement.ingresoNumero ?? movement.grupoId;

    this.openConfirm({
      title: 'Anular ingreso completo',
      message: 'Se anularán todos los productos de este ingreso y se revertirá su stock.',
      highlight: label,
      confirmLabel: 'Sí, anular ingreso',
      run: () => this.executeAnularIngreso(movement),
    });
  }

  protected onConfirmDialogConfirmed(): void {
    this.pendingConfirm?.run();
  }

  protected onConfirmDialogCancelled(): void {
    if (this.confirmLoading()) return;
    this.closeConfirm();
  }

  private openConfirm(config: PendingConfirmAction): void {
    this.pendingConfirm = config;
    this.confirmTitle.set(config.title);
    this.confirmMessage.set(config.message);
    this.confirmHighlight.set(config.highlight);
    this.confirmLabel.set(config.confirmLabel);
    this.confirmOpen.set(true);
  }

  private closeConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmLoading.set(false);
    this.pendingConfirm = null;
  }

  private executeAnular(movement: Movement): void {
    this.confirmLoading.set(true);
    this.actionError.set(null);
    this.actionMessage.set(null);
    this.annullingId.set(movement.id);

    this.movementService.anularMovement(movement.id).subscribe({
      next: () => {
        this.annullingId.set(null);
        this.closeConfirm();
        this.actionMessage.set(`Movimiento ${movement.numero} anulado.`);
        this.movementService.refreshStock(movement.productId, true).subscribe();
        this.movementService.invalidateConsumoConsignacionCache();
        this.loadSummaryCounts();
        this.reload$.next();
      },
      error: (err: Error) => {
        this.annullingId.set(null);
        this.confirmLoading.set(false);
        this.actionError.set(err.message);
      },
    });
  }

  private executeAnularIngreso(movement: Movement): void {
    if (!movement.grupoId) return;
    const label = movement.ingresoNumero ?? movement.grupoId;

    this.confirmLoading.set(true);
    this.actionError.set(null);
    this.actionMessage.set(null);
    this.annullingGrupoId.set(movement.grupoId);

    this.movementService.anularGrupo(movement.grupoId).subscribe({
      next: () => {
        this.annullingGrupoId.set(null);
        this.closeConfirm();
        this.actionMessage.set(`Ingreso ${label} anulado.`);
        this.productService.refresh().subscribe();
        this.movementService.invalidateConsumoConsignacionCache();
        this.loadSummaryCounts();
        this.reload$.next();
      },
      error: (err: Error) => {
        this.annullingGrupoId.set(null);
        this.confirmLoading.set(false);
        this.actionError.set(err.message);
      },
    });
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const dir = this.direccionFilter();
    const tipo = this.tipoFilter();
    const cat = this.categoryFilter();
    const stock = this.stockTipoFilter();
    const productId = this.productFilterControl.value.trim();

    this.movementService
      .fetchPage({
        page,
        pageSize: PAGE_SIZE,
        q: this.search() || undefined,
        productId: productId || undefined,
        direccion: dir === 'all' ? undefined : dir,
        tipo: tipo === 'all' ? undefined : tipo,
        categorySlug: cat === 'all' ? undefined : cat,
        stockTipo: stock === 'all' ? undefined : stock,
        estado: this.estadoFilter(),
      })
      .subscribe({
        next: (res) => {
          this.movements.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.anulacionHorasLimite.set(res.anulacionHorasLimite ?? 72);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.loadError.set(err.message);
        },
      });
  }

  private loadSummaryCounts(): void {
    this.movementService.fetchSummaryCounts().subscribe({
      next: ({ subidas, bajadas }) => {
        this.totalSubidas.set(subidas);
        this.totalBajadas.set(bajadas);
      },
    });
  }

  private loadConsumoConsignacion(force = false): void {
    if (force) {
      this.movementService.invalidateConsumoConsignacionCache();
    }

    this.movementService.fetchConsumoConsignacion().subscribe({
      next: (res) => this.consumoConsignacion.set(res),
      error: () => this.consumoConsignacion.set(null),
    });
  }

  private filterMovementsForEstado(
    items: Movement[],
    estado: MovementEstadoFiltro,
  ): Movement[] {
    if (estado === 'anulados') {
      return items.filter((m) => isMovimientoAnulado(m));
    }
    return items.filter((m) => m.activo);
  }

  private syncProductFilterWithCategory(): void {
    const productId = this.productFilterControl.value;
    if (!productId) return;

    const category = this.categoryFilter();
    if (category === 'all') return;

    const product = this.productService.getById(productId);
    if (product && product.categorySlug !== category) {
      this.productFilterControl.setValue('', { emitEvent: false });
    }
  }
}
