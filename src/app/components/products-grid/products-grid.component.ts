import { Component, Input, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-products-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products-grid.component.html',
  styleUrl: './products-grid.component.css'
})
export class ProductsGridComponent {
  // Recibimos la lista de supercargadores desde el componente padre
  @Input() listaProductos: any[] = [];
  state: any;

  // Imagen de respaldo inline para evitar "CONTENIDO NO DISPONIBLE" si falla la URL
  readonly fallbackImg: string =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#0B1D3A"/>
        <text x="300" y="190" text-anchor="middle" fill="#93C5FD" font-family="Arial, sans-serif" font-size="24" font-weight="bold">7VOLTEX MOTORSPORT</text>
        <text x="300" y="225" text-anchor="middle" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="15">Sin imagen disponible</text>
      </svg>
    `);

  constructor(
    @Optional() private voltexState: VoltexStateService | null,
    private router: Router
  ) {
    this.state = this.voltexState;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src !== this.fallbackImg) {
      img.src = this.fallbackImg;
    }
  }

  verDetalle(item: any) {
    if (!item?.id) return;
    this.router.navigate(['/producto', item.id]);
  }

  agregarAlCarrito(producto: any) {
    if (!producto) return;

    const stockActual = Number(producto.stock ?? 10);
    if (stockActual <= 0) return;

    const itemAdaptado: any = {
      ...producto,
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion || producto.subtitulo || '',
      price: Number(producto.price ?? producto.precio ?? 0),
      imageUrl: producto.imageUrl || producto.imagen || producto.image || this.fallbackImg,
      category: producto.category || producto.categoria || producto.etiqueta || 'Supercargadores',
      marca: producto.marca || 'Voltex Pro',
      modalidad: producto.modalidad || 'Inducción Forzada',
      quantity: 1
    };

    const estado = this.state || this.voltexState;
    if (!estado) return;

    if (typeof estado.agregarProductoAlCarrito === 'function') {
      estado.agregarProductoAlCarrito(itemAdaptado);
    } else if (typeof estado.añadirAlCarrito === 'function') {
      estado.añadirAlCarrito(itemAdaptado);
    } else if (typeof estado.agregarAlCarrito === 'function') {
      estado.agregarAlCarrito(itemAdaptado);
    } else if (Array.isArray(estado.carrito)) {
      estado.carrito.push(itemAdaptado);
    }
  }
}