import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoltexStateService {
  // Estado del usuario actual
  usuarioActual = signal<any>(null);

  // Lista de notificaciones / alertas del sistema
  notificaciones = signal<any[]>([]);

  // Tarjeta guardada para pagos rápidos / Quick Pay
  tarjetaGuardada = signal<any>(null);

  // Carrito de compras
  carrito = signal<any[]>([]);

  // Catálogo de productos generales
  productos = signal<any[]>([]);

  // Método requerido por store.component.ts para actualizar los productos
  setProductos(prods: any[]) {
    this.productos.set(prods);
  }

  // Método para lanzar notificaciones en vivo
  lanzarNotificacion(titulo: string, mensaje: string, tipo: string = 'push', hora?: string) {
    const nuevaAlerta = {
      id: Date.now(),
      titulo,
      mensaje,
      tipo,
      hora: hora || new Date().toLocaleTimeString()
    };
    this.notificaciones.update(current => [nuevaAlerta, ...current]);
  }

  // Método para añadir productos al carrito de compras
  añadirAlCarrito(producto: any) {
    this.carrito.update(current => [...current, producto]);
  }
}