import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Movement } from '../../../core/models/movement.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { MovementService } from '../../../core/services/movement.service';
import { ProductService } from '../../../core/services/product.service';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

interface ActivityItem {
  id: string;
  type: 'entrada' | 'salida' | 'ajuste';
  product: string;
  quantity: number;
  user: string;
  time: string;
  numero: string;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
}

@Component({
  selector: 'app-dashboard-home',
  imports: [RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly movementService = inject(MovementService);
  private readonly categoryService = inject(CategoryService);

  protected readonly user = this.auth.user;

  protected readonly todayKey = new Date().toISOString().split('T')[0];
  protected readonly movimientosHoy = signal(0);
  protected readonly entradasHoy = signal(0);
  protected readonly salidasHoy = signal(0);
  protected readonly recentMovements = signal<Movement[]>([]);

  protected get firstName(): string {
    return this.user()?.name?.split(' ')[0] ?? 'Usuario';
  }

  protected readonly today = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  protected readonly stats = computed((): StatCard[] => {
    const products = this.productService.all().filter((p) => p.activo);

    let stockPropio = 0;
    let stockConsignacion = 0;
    let lowStockCount = 0;

    for (const product of products) {
      const stock = this.movementService.getStock(product.id);
      stockPropio += stock.propio;
      stockConsignacion += stock.consignacion.reduce((sum, item) => sum + item.cantidad, 0);

      if (product.stockMinimo > 0 && stock.propio <= product.stockMinimo) {
        lowStockCount++;
      }
    }

    const planchasCount = products.filter((p) => p.categorySlug === 'planchas').length;
    const todayMovements = this.movimientosHoy();

    return [
      {
        label: 'Total productos',
        value: String(products.length),
        change: `${planchasCount} planchas activas`,
        trend: 'neutral',
        icon: '📦',
        color: '#4f46e5',
      },
      {
        label: 'Stock propio',
        value: String(stockPropio),
        change:
          stockConsignacion > 0
            ? `${stockConsignacion} uds en consignación`
            : 'Unidades en inventario propio',
        trend: stockPropio > 0 ? 'up' : 'neutral',
        icon: '📊',
        color: '#10b981',
      },
      {
        label: 'Movimientos hoy',
        value: String(todayMovements),
        change: `${this.entradasHoy()} entradas · ${this.salidasHoy()} salidas`,
        trend: 'neutral',
        icon: '🔄',
        color: '#06b6d4',
      },
      {
        label: 'Stock bajo',
        value: String(lowStockCount),
        change: lowStockCount > 0 ? 'Requiere atención' : 'Todo en orden',
        trend: lowStockCount > 0 ? 'down' : 'up',
        icon: '⚠️',
        color: '#f59e0b',
      },
    ];
  });

  protected readonly recentActivity = computed((): ActivityItem[] => {
    return this.recentMovements().map((movement) => ({
      id: movement.id,
      type: this.mapActivityType(movement),
      product: this.productService.getById(movement.productId)?.nombre ?? 'Producto',
      quantity: movement.direccion === 'bajada' ? -movement.cantidad : movement.cantidad,
      user: movement.usuario,
      time: this.formatRelativeTime(movement.fechaRegistro),
      numero: movement.numero,
    }));
  });

  protected readonly lowStock = computed((): LowStockItem[] => {
    return this.productService
      .all()
      .filter((p) => p.activo)
      .map((product) => ({
        product,
        stock: this.movementService.getStock(product.id).propio,
      }))
      .filter(({ product, stock }) => product.stockMinimo > 0 && stock <= product.stockMinimo)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map(({ product, stock }) => ({
        id: product.id,
        name: product.nombre,
        sku: product.sku,
        stock,
        minStock: product.stockMinimo,
        category:
          this.categoryService.getBySlug(product.categorySlug)?.name ?? product.categorySlug,
      }));
  });

  ngOnInit(): void {
    const today = this.todayKey;
    forkJoin({
      hoy: this.movementService.count({ fechaDesde: today, fechaHasta: today }),
      entradas: this.movementService.count({
        fechaDesde: today,
        fechaHasta: today,
        direccion: 'subida',
      }),
      salidas: this.movementService.count({
        fechaDesde: today,
        fechaHasta: today,
        direccion: 'bajada',
      }),
      recientes: this.movementService.fetchPage({ page: 1, pageSize: 8 }),
    }).subscribe({
      next: ({ hoy, entradas, salidas, recientes }) => {
        this.movimientosHoy.set(hoy);
        this.entradasHoy.set(entradas);
        this.salidasHoy.set(salidas);
        this.recentMovements.set(recientes.items);
      },
    });
  }

  protected getActivityLabel(type: ActivityItem['type']): string {
    const labels = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' };
    return labels[type];
  }

  protected getStockPercent(item: LowStockItem): number {
    if (item.minStock <= 0) return 0;
    return Math.min((item.stock / item.minStock) * 100, 100);
  }

  private mapActivityType(movement: Movement): ActivityItem['type'] {
    if (movement.tipo === 'ajuste_entrada' || movement.tipo === 'ajuste_salida') {
      return 'ajuste';
    }

    return movement.direccion === 'subida' ? 'entrada' : 'salida';
  }

  private formatRelativeTime(iso: string): string {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} d`;

    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  }
}
