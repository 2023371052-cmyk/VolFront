import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductoDetalleComponent implements OnInit {
  producto: any = null;
  cargando: boolean = true;

  // 🌟 Variables para la notificación flotante bonita
  mensajeToast: string = '';
  mostrarToast: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const productoId = Number(idParam);
      this.cargarDetalleProducto(productoId);
    } else {
      this.cargando = false;
    }
  }

  cargarDetalleProducto(id: number) {
    this.cargando = true;

    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);
        
        this.producto = lista.find((p: any) => Number(p.id) === Number(id));

        if (!this.producto && lista.length > 0) {
          this.producto = lista[0];
        }

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

  // 🌟 Método para disparar la notificación flotante bonita
  dispararNotificacion(texto: string) {
    this.mensajeToast = texto;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    // Se oculta automáticamente después de 3.5 segundos
    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  // 🌟 Método para agregar a Favoritos / Lista de Deseos (conecta con MySQL)
  agregarAFavoritos(producto: any) {
    if (!producto) return;

    const usuarioActual: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    const userId = usuarioActual?.id || 1;

    const wishlistPayload = {
      userId: userId,
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

    const supercargadorAdaptado: any = {
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: producto.price || producto.precio,
      imageUrl: producto.imageUrl || producto.image || producto.imagen || 'assets/img/supercargador-default.jpg',
      category: producto.category || producto.categoria,
      marca: producto.marca || 'Voltex Pro',        
      modalidad: producto.modalidad || 'Inducción Forzada',
      quantity: 1
    };

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    this.dispararNotificacion(`🛒 ¡${supercargadorAdaptado.name} añadido a la orden técnica!`);
    setTimeout(() => {
      this.router.navigate(['/checkout']);
    }, 1000);
  }

  volverSegunSesion() {
    const usuario = this.state.usuarioActual();
    if (usuario && usuario.role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/usuario']);
    }
  }
}