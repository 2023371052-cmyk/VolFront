import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class VoltexApiService {
  
private apiUrl = 'https://volback-production.up.railway.app/api';
//private apiUrl = 'http://localhost:3000/api';

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

   // 🌟 Actualizar perfil de usuario (¡Nuevo!)
  actualizarPerfil(userId: number, datos: { name: string; email: string; password?: string }) {
  return this.http.post(`${this.apiUrl}/usuarios/actualizar/${userId}`, datos);
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

 // ==================== NOTIFICACIONES PUSH ====================

  // Obtener notificaciones (filtradas por hora en usuario, o todas en admin con todas = true)
  getNotificaciones(todas: boolean = false): Observable<any> {
    const query = todas ? '?todas=true' : '';
    return this.http.get<any>(`${this.apiUrl}/notifications${query}`);
  }

  // Enviar / Programar una nueva notificación push a la BD
  enviarNotificacion(notif: {
    titulo: string;
    mensaje: string;
    horaProgramada: string;
    fechaHoraProgramada?: string;
    tipo: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications`, notif);
  }

  // Editar una notificación existente desde el panel de Admin
  editarNotificacion(
    id: number | string,
    data: { titulo: string; mensaje: string; horaProgramada: string; tipo?: string }
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications/editar/${id}`, data);
  }

  // Marcar una notificación como leída
  marcarNotificacionLeida(id: number | string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications/leer/${id}`, {});
  }

  // Eliminar una notificación
  eliminarNotificacion(id: number | string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notifications/eliminar/${id}`, {});
  }

  // ==================== MANUALES DE PRODUCTO (QR) ====================

  getManuales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/manuals`);
  }

  getManualPorProducto(productId: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/manuals/product/${productId}`);
  }

  guardarManualProducto(data: {
    productId: number;
    title: string;
    manualUrl: string;
    fileName?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/manuals`, data);
  }

  eliminarManualProducto(productId: number | string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/manuals/eliminar/${productId}`, {});
  }

  subirManualArchivo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/manuals/upload`, formData);
  }

  getAvatars() {
  return this.http.get<any[]>(`${this.apiUrl}/avatars`);
}
}
