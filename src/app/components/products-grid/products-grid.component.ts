import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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

  agregarAlCarrito(producto: any) {
    if (this.state && typeof this.state.agregarProductoAlCarrito === 'function') {
      this.state.agregarProductoAlCarrito(producto);
    }
  }
}