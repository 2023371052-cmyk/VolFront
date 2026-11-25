import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-consumibles',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './consumibles.html',
  styleUrl: './consumibles.css',
})
export class ConsumiblesComponent implements OnInit {
  productosConsumible: any[] = [];
  cargando = true;

  readonly fallbackImg: string =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#0B1D3A"/>
        <text x="300" y="190" text-anchor="middle" fill="#93C5FD" font-family="Arial, sans-serif" font-size="24" font-weight="bold">7VOLTEX MOTORSPORT</text>
        <text x="300" y="225" text-anchor="middle" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="15">Consumible Técnico</text>
      </svg>
    `);

  constructor(
    private voltexApi: VoltexApiService,
    private state: VoltexStateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarProductosDeBaseDeDatos();
  }

  private normalizarTexto(valor: any): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src !== this.fallbackImg) {
      img.src = this.fallbackImg;
    }
  }

  cargarProductosDeBaseDeDatos() {
    this.cargando = true;
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);

        this.productosConsumible = lista.filter((p: any) => {
          const tipo = this.normalizarTexto(
            p.tipo_supercargador || p.tipo || p.category || p.categoria
          );
          return tipo === 'consumible' || tipo === 'consumibles';
        });

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar consumibles de 7VOLTEX:', err);
        this.productosConsumible = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  volverSegunSesion() {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.router.navigate(['/usuario']);
    } else {
      this.router.navigate(['/tienda']);
    }
  }

  agregarAlCarrito(producto: any) {
    const itemAdaptado: any = {
      ...producto,
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: Number(producto.price ?? producto.precio ?? 0),
      imageUrl: producto.imageUrl || producto.image || producto.imagen || this.fallbackImg,
      category: producto.category || producto.categoria || 'Consumible',
      marca: producto.marca || '7VOLTEX Fluids & Belts',
      modalidad: producto.tipo_supercargador || producto.tipo || 'Consumible',
      quantity: 1
    };

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(itemAdaptado);
    } else if (typeof estadoGlobal.agregarAlCarrito === 'function') {
      estadoGlobal.agregarAlCarrito(itemAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(itemAdaptado);
    }

    alert(`${itemAdaptado.name} se ha añadido a tu orden técnica.`);
    this.router.navigate(['/checkout']);
  }
}