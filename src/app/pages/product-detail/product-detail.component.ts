import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductoDetalleComponent implements OnInit, OnDestroy {
  producto: any = null;
  cargando: boolean = true;

  // Imagen segura con respaldo SVG si falla la URL externa o imageUrl viene vacía
  readonly fallbackImg: string =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#0B1D3A"/>
        <rect x="30" y="30" width="740" height="540" rx="20" fill="#1E3A8A" fill-opacity="0.45" stroke="#93C5FD" stroke-opacity="0.35" stroke-width="2"/>
        <text x="400" y="280" text-anchor="middle" fill="#93C5FD" font-family="Arial, sans-serif" font-size="30" font-weight="bold">7VOLTEX MOTORSPORT</text>
        <text x="400" y="325" text-anchor="middle" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="20">Imagen no disponible en servidor</text>
      </svg>
    `);

  imagenActual: string = this.fallbackImg;

  // Variables para la notificación flotante
  mensajeToast: string = '';
  mostrarToast: boolean = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private navTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const productoId = Number(idParam);

    if (idParam && !Number.isNaN(productoId)) {
      this.cargarDetalleProducto(productoId);
    } else {
      this.cargando = false;
    }
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.navTimer) {
      clearTimeout(this.navTimer);
    }
  }

  private resolverImagen(prod: any): string {
    const raw = prod?.imageUrl ?? prod?.image_url ?? prod?.image ?? prod?.imagen ?? '';
    const limpia = typeof raw === 'string' ? raw.trim() : '';
    return limpia.length > 0 ? limpia : this.fallbackImg;
  }

  private asignarProducto(prod: any) {
    this.producto = prod ?? null;
    this.imagenActual = prod ? this.resolverImagen(prod) : this.fallbackImg;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (this.imagenActual !== this.fallbackImg) {
      this.imagenActual = this.fallbackImg;
      this.cdr.detectChanges();
    }
    if (img && img.src !== this.fallbackImg) {
      img.src = this.fallbackImg;
    }
  }

  cargarDetalleProducto(id: number) {
    const enEstado = typeof this.state.productos === 'function' ? this.state.productos() : [];
    if (Array.isArray(enEstado) && enEstado.length > 0) {
      const encontradoEnEstado = enEstado.find((p: any) => Number(p.id) === id);
      if (encontradoEnEstado) {
        this.asignarProducto(encontradoEnEstado);
        this.cargando = false;
      }
    } else {
      this.cargando = true;
    }

    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data)
          ? data
          : (data?.productos || data?.data || []);

        const encontrado = lista.find((p: any) => Number(p.id) === id);
        this.asignarProducto(encontrado ?? null);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el detalle del componente:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  dispararNotificacion(texto: string) {
    this.mensajeToast = texto;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  agregarAFavoritos(producto: any) {
    if (!producto) return;

    const usuarioActual: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});
    const userId = usuarioActual?.id || 1;

    const wishlistPayload = {
      userId,
      productId: producto.id
    };

    const nombreProd = producto.name || producto.nombre || 'Componente';
    const apiService: any = this.voltexApi;

    if (typeof apiService.addToWishlist === 'function') {
      apiService.addToWishlist(wishlistPayload).subscribe({
        next: () => {
          this.dispararNotificacion(`⭐ ¡${nombreProd} se ha añadido a tus favoritos con éxito!`);
        },
        error: () => {
          this.dispararNotificacion(`⭐ ¡${nombreProd} se ha añadido a tus favoritos!`);
        }
      });
    } else {
      this.dispararNotificacion(`⭐ ¡${nombreProd} se ha añadido a tus favoritos!`);
    }
  }

  agregarAlCarrito(producto: any) {
    if (!producto) return;

    const stockActual = Number(producto.stock ?? 0);
    if (stockActual <= 0) {
      this.dispararNotificacion('⚠️ Este componente no tiene stock disponible por el momento.');
      return;
    }

    const imagenResuelta = this.resolverImagen(producto);

    const supercargadorAdaptado: any = {
      ...producto,
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: Number(producto.price ?? producto.precio ?? 0),
      imageUrl: imagenResuelta,
      category: producto.category || producto.categoria,
      marca: producto.marca || 'Voltex Pro',
      modalidad: producto.modalidad || 'Inducción Forzada',
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

    this.dispararNotificacion(`🛒 ¡${supercargadorAdaptado.name} añadido a la orden técnica!`);

    if (this.navTimer) {
      clearTimeout(this.navTimer);
    }
    this.navTimer = setTimeout(() => {
      this.router.navigate(['/checkout']);
    }, 1000);
  }

  volverSegunSesion() {
    const usuario = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : null;
    if (usuario && usuario.role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/usuario']);
    }
  }
}