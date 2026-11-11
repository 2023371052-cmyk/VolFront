import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class VoltexApiService {
  post(arg0: string, arg1: { name: string; email: string; password: string; }) {
      throw new Error('Method not implemented.');
  }
 private apiUrl = environment.apiUrl; // Puerto de tu backend de NestJS

  constructor(private http: HttpClient) {}

  // ==================== PRODUCTOS ====================

  // Obtener productos de MySQL
  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/productos`);
  }

  // Obtener un producto específico por su ID
  getProductoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/productos/${id}`);
  }

  // Crear un producto nuevo en MySQL (Admin)
  crearProducto(producto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/productos`, producto);
  }

  // Actualizar un producto existente (Admin)
  actualizarProducto(id: number, producto: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/productos/actualizar/${id}`, producto);
  }

  // Eliminar producto de MySQL (Admin)
  eliminarProducto(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/productos/eliminar/${id}`, {});
  }

  // ==================== AUTENTICACIÓN Y USUARIOS ====================

  // Iniciar sesión con correo y contraseña
  login(credentials: { email: string; password?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials);
  }

  // 🌟 Registrar una nueva cuenta de usuario (¡Nuevo!)
  registrarUsuario(userData: { name: string; email: string; password?: string; role?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  // ==================== ÓRDENES Y COMPRAS ====================

  // Crear/Registrar una orden de compra desde el Checkout
  crearOrden(ordenData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ordenes`, ordenData);
  }

  // Obtener el historial de órdenes por usuario
  getOrdenesPorUsuario(userId: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ordenes/usuario/${userId}`);
  }

  // ==================== LISTA DE DESEOS (FAVORITOS) ====================

  // 🌟 Obtener la lista de deseos de un usuario (¡Nuevo!)
  getWishlist(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/wishlist/${userId}`);
  }

  // 🌟 Agregar un componente a la lista de deseos (¡Nuevo!)
  addToWishlist(wishlistData: { userId: number; productId: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/wishlist`, wishlistData);
  }

  // 🌟 Eliminar un elemento de la lista de deseos (¡Nuevo!)
  removeFromWishlist(wishlistId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/wishlist/${wishlistId}`);
  }

  // ==================== NOTIFICACIONES PUSH ====================

  // Obtener todas las notificaciones push desde el backend
  getNotificaciones(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notifications`);
  }

  // Enviar / Programar una nueva notificación push a la BD
  enviarNotificacion(notif: { titulo: string; mensaje: string; horaProgramada: string; tipo: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications`, notif);
  }
}