import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
import { deseosService } from '../deseos/deseos.service'; // Ajusta la ruta si está en otra carpeta

@Component({
  selector: 'app-deseos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule ],
  templateUrl: './deseos.html',
  styleUrl: './deseos.css'
})
export class Deseos implements OnInit {
  wishlist: any[] = [];
  cargando: boolean = true;
  private usuarioIdActual: string | number = 'invitado';

  constructor(
    public state: VoltexStateService,
    private router: Router,
    private voltexApi: VoltexApiService,
    private deseosSrv: deseosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const usuario: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});

    if (!usuario || !usuario.email) {
      alert('Debes iniciar sesión para acceder a tu Lista de Deseos.');
      this.router.navigate(['/login']);
      return;
    }

    const userId = usuario.id || usuario.userId || usuario.usuarioId || usuario.sub || usuario.email || 1;
    this.usuarioIdActual = userId;

    // 1. Consulta local inmediata por usuario
    this.cargarListaDeseosLocal();

    // 2. Sincronización con BD sin borrar la lista local si viene vacía
    if (typeof userId === 'number' || !Number.isNaN(Number(userId))) {
      this.sincronizarConBD(Number(userId));
    } else {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  cargarListaDeseosLocal() {
    this.wishlist = this.deseosSrv.obtenerDeseos(this.usuarioIdActual);
    this.cargando = false;
    this.cdr.detectChanges();
  }

  sincronizarConBD(userId: number) {
    this.voltexApi.getWishlist(userId).subscribe({
      next: (data: any) => {
        console.log('⭐ DESEOS RECIBIDOS DE LA BD:', data);
        const lista = Array.isArray(data) ? data : (data?.wishlist || data?.data || []);
        const productosBD = lista.map((w: any) => w.product || w).filter(Boolean);

        if (productosBD.length > 0) {
          this.wishlist = productosBD;
          this.deseosSrv.guardarDeseos(this.wishlist, this.usuarioIdActual);
        } else if (this.wishlist.length > 0) {
          this.deseosSrv.guardarDeseos(this.wishlist, this.usuarioIdActual);
        } else {
          this.wishlist = [];
          this.deseosSrv.guardarDeseos([], this.usuarioIdActual);
        }

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
    event.stopPropagation();

    console.log('🗑️ Ejecutando baja estructurada del producto ID:', productId);

    this.deseosSrv.eliminarDeDeseos(productId, this.usuarioIdActual);
    this.wishlist = this.deseosSrv.obtenerDeseos(this.usuarioIdActual);
    this.cdr.detectChanges();

    this.voltexApi.removeFromWishlist(productId).subscribe({
      next: (res) => {
        console.log('✅ Baja sincronizada con la BD con éxito:', res);
      },
      error: (err) => {
        console.warn('⚠️ Sin conexión con la nube. Baja procesada localmente de forma offline:', err);
      }
    });
  }

  agregarAlCarrito(item: any, event: Event) {
    event.stopPropagation();

    const usuario: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});

    if (!usuario || !usuario.email) {
      alert('Inicia sesión para poder gestionar componentes.');
      this.router.navigate(['/login']);
      return;
    }

    const supercargadorAdaptado: any = {
      id: item.id,
      name: item.name || item.nombre,
      description: item.description || item.descripcion,
      price: item.price || item.precio,
      imageUrl: item.imageUrl || item.image || item.imagen || '/avatars/hombre3.jpg',
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