import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; 
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './usuario.html', 
  styleUrl: './usuario.css' 
})
export class Usuario implements OnInit {
  isScrolled: boolean = false;
  usuarioEmail: string | null = null;
  
  products: any[] = [];
  pedidos: any[] = [];
  listaDeseos: any[] = [];
  cargando = true;

  // 🌟 Variables para la notificación flotante bonita
  mensajeToast: string = '';
  mostrarToast: boolean = false;

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.usuarioEmail = user.email;
      this.cargarDatosReales(user.email);
    } else {
      this.router.navigate(['/login']);
    }
  }

  cargarDatosReales(email: string) {
    this.cargando = true;

    // 1. Cargamos los productos
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        console.log("📦 PRODUCTOS RECIBIDOS DE LA BD:", data);
        
        if (Array.isArray(data)) {
          this.products = data;
        } else if (data && Array.isArray(data.products)) {
          this.products = data.products;
        } else if (data && Array.isArray(data.productos)) {
          this.products = data.productos;
        } else if (data && Array.isArray(data.data)) {
          this.products = data.data;
        } else {
          this.products = [];
        }

        this.cargando = false; 
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar productos de la BD:', err);
        this.products = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });

    // 2. Cargamos las órdenes del usuario
    this.voltexApi.getOrdenesPorUsuario(email).subscribe({
      next: (data: any) => {
        this.pedidos = Array.isArray(data) ? data : (data.ordenes || data.data || []);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el historial de pedidos:', err);
        this.pedidos = [];
      }
    });
  }

  // 🌟 Método para disparar la notificación flotante bonita
  dispararNotificacion(texto: string) {
    this.mensajeToast = texto;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  agregarAlCarrito(producto: any) {
    const supercargadorAdaptado: any = {
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: producto.price || producto.precio,
      imageUrl: producto.imageUrl || producto.image || producto.imagen,
      category: producto.category || producto.categoria,
      marca: producto.marca || 'Voltex Pro',        
      modalidad: producto.modalidad || 'Inducción',
      quantity: 1
    };

    // Añadimos al estado global de forma segura
    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    // 🌟 Mostramos la notificación bonita y redirigimos al checkout después de un instante
    this.dispararNotificacion(`🛒 ¡${supercargadorAdaptado.name} añadido a la orden técnica!`);
    setTimeout(() => {
      this.router.navigate(['/checkout']); 
    }, 900);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Si el scroll baja más de 80 píxeles, contrae el header superior
    this.isScrolled = window.scrollY > 80;
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}