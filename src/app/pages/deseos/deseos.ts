import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- Importante para formularios y directivas
import { RouterModule, Router } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
import { FooterUsuario } from '../../components/footer-usuario/footer-usuario';

@Component({
  selector: 'app-deseos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FooterUsuario],
  templateUrl: './deseos.html',
  styleUrl: './deseos.css'
})
export class Deseos implements OnInit {
  wishlist: any[] = [];
  cargando: boolean = true;
  private STORAGE_KEY = 'voltex_wishlist';

  constructor(
    public state: VoltexStateService, 
    private router: Router,
    private voltexApi: VoltexApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // PROTECCIÓN: Si no hay usuario logueado, redirigir al login
    const usuario: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    if (!usuario || !usuario.email) {
      alert("Debes iniciar sesión para acceder a tu Lista de Deseos.");
      this.router.navigate(['/login']);
      return;
    }

    // 1. CONSULTA LOCAL (Offline-first)
    this.cargarListaDeseosLocal();

    // 2. Sincronización con la base de datos MySQL
    const userId = usuario.id || usuario.userId || 1;
    this.sincronizarConBD(userId);
  }

  cargarListaDeseosLocal() {
    try {
      const dataLocal = localStorage.getItem(this.STORAGE_KEY);
      if (dataLocal) {
        this.wishlist = JSON.parse(dataLocal);
      }
    } catch (e) {
      console.error("Error al leer el almacenamiento local estructurado:", e);
    }
    this.cargando = false;
    this.cdr.detectChanges();
  }

  sincronizarConBD(userId: number) {
    this.voltexApi.getWishlist(userId).subscribe({
      next: (data: any) => {
        console.log("⭐ DESEOS RECIBIDOS DE LA BD:", data);
        const lista = Array.isArray(data) ? data : (data.wishlist || data.data || []);
        
        this.wishlist = lista.map((w: any) => w.product || w);
        
        // Actualizamos el almacenamiento local para persistencia offline
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.wishlist));
        
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.warn('Modo offline activo o error de conexión con la BD, operando con almacenamiento local:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminarDeLista(productId: number, event: Event) {
    event.stopPropagation(); // Evita que se active el routerLink de la tarjeta al dar clic en la papelera

    console.log("🗑️ Ejecutando baja estructurada del producto ID:", productId);

    // BAJA LOCAL (Actualización inmediata en pantalla y LocalStorage)
    this.wishlist = this.wishlist.filter(item => item.id !== productId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.wishlist));
    this.cdr.detectChanges();

    // Sincronización de la baja con el backend en la nube
    this.voltexApi.removeFromWishlist(productId).subscribe({
      next: (res) => {
        console.log("✅ Baja sincronizada con la BD con éxito:", res);
      },
      error: (err) => {
        console.warn("⚠️ Sin conexión con la nube. Baja procesada localmente de forma offline:", err);
      }
    });
  }

  agregarAlCarrito(item: any, event: Event) {
    event.stopPropagation(); // Evita que se active el routerLink al dar clic en agregar
    
    const usuario: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    if (!usuario || !usuario.email) {
      alert("Inicia sesión para poder gestionar componentes.");
      this.router.navigate(['/login']);
      return;
    }

    const supercargadorAdaptado: any = {
      id: item.id,
      name: item.name || item.nombre,
      description: item.description || item.descripcion,
      price: item.price || item.precio,
      imageUrl: item.imageUrl || item.image || item.imagen || 'assets/img/supercargador-default.jpg',
      category: item.category || item.categoria,
      marca: item.marca || 'Voltex Pro',        
      modalidad: item.modalidad || 'Inducción Forzada',
      quantity: 1
    };

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    alert(`${supercargadorAdaptado.name} se ha añadido a tu orden técnica.`);
    this.router.navigate(['/checkout']); 
  }
}