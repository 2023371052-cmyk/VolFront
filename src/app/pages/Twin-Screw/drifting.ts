import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-drifting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drifting.html',
  styleUrl: './drifting.css',
})
export class DriftingComponent implements OnInit {
  productosDrifting: any[] = [];
  cargando = true;

  readonly fallbackImg: string =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#0B1D3A"/>
        <text x="300" y="190" text-anchor="middle" fill="#93C5FD" font-family="Arial, sans-serif" font-size="24" font-weight="bold">7VOLTEX MOTORSPORT</text>
        <text x="300" y="225" text-anchor="middle" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="15">Twin-Screw Supercharger</text>
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

  // Petición directa a la BD y filtrado por tecnología Twin-Screw
  cargarProductosDeBaseDeDatos() {
    this.cargando = true;
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);

        // Filtramos estrictamente por tipo_supercargador = 'Twin-Screw'
        this.productosDrifting = lista.filter((p: any) => {
          const tipo = this.normalizarTexto(p.tipo_supercargador);
          return tipo === 'twin-screw' || tipo === 'twin screw';
        });

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al conectar con la base de datos de 7VOLTEX (Twin-Screw):', err);
        this.productosDrifting = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Botón de Volver inteligente según la sesión
  volverSegunSesion() {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.router.navigate(['/usuario']);
    } else {
      this.router.navigate(['/tienda']);
    }
  }

  // Agregar a la línea de ensamblaje (carrito)
  agregarAlCarrito(producto: any) {
    const supercargadorAdaptado: any = {
      ...producto,
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: Number(producto.price ?? producto.precio ?? 0),
      imageUrl: producto.imageUrl || producto.image || producto.imagen || this.fallbackImg,
      category: producto.category || producto.categoria || 'Supercargadores',
      marca: producto.marca || 'Voltex Pro',
      modalidad: producto.tipo_supercargador || 'Twin-Screw',
      quantity: 1
    };

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (typeof estadoGlobal.agregarAlCarrito === 'function') {
      estadoGlobal.agregarAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    alert(`${supercargadorAdaptado.name} se ha añadido a tu orden técnica.`);
    this.router.navigate(['/checkout']);
  }
}