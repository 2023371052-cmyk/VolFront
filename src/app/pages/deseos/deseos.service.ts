import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class deseosService {
  private readonly BASE_KEY = 'voltex_wishlist';

  private obtenerIdUsuarioActual(): string | number {
    try {
      const keys = ['voltex_user', 'usuarioActual', 'usuario', 'user'];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const id = parsed?.id ?? parsed?.userId ?? parsed?.usuarioId ?? parsed?.sub ?? parsed?.email;
          if (id) {
            return id;
          }
        }
      }
    } catch {
      // Ignora errores de lectura de sesión
    }
    return 'invitado';
  }

  private getStorageKey(userId?: string | number): string {
    const id = userId ?? this.obtenerIdUsuarioActual();
    return `${this.BASE_KEY}_${id}`;
  }

  // CONSULTA (Read): Obtener todos los elementos guardados para el usuario actual
  obtenerDeseos(userId?: string | number): any[] {
    try {
      const key = this.getStorageKey(userId);
      let data = localStorage.getItem(key);

      // Migra datos anteriores guardados bajo 'voltex_wishlist' sin ID
      if (!data) {
        const legacyData = localStorage.getItem(this.BASE_KEY);
        if (legacyData) {
          localStorage.setItem(key, legacyData);
          data = legacyData;
        }
      }

      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error al leer deseos en localStorage:', e);
      return [];
    }
  }

  // Guardar lista completa (útil al sincronizar con BD)
  guardarDeseos(items: any[], userId?: string | number): void {
    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (e) {
      console.error('Error al guardar deseos en localStorage:', e);
    }
  }

  // ALTA (Create): Agregar un componente a la lista de deseos
  agregarADeseos(producto: any, userId?: string | number): void {
    const deseos = this.obtenerDeseos(userId);
    if (!deseos.some(p => p.id === producto.id)) {
      deseos.push(producto);
      this.guardarDeseos(deseos, userId);
    }
  }

  // BAJA (Delete): Eliminar un producto por su ID
  eliminarDeDeseos(id: number | string, userId?: string | number): void {
    let deseos = this.obtenerDeseos(userId);
    deseos = deseos.filter(p => p.id !== id);
    this.guardarDeseos(deseos, userId);
  }

  // CONSULTA AUXILIAR: Verificar si un producto ya está en favoritos
  esFavorito(id: number | string, userId?: string | number): boolean {
    const deseos = this.obtenerDeseos(userId);
    return deseos.some(p => p.id === id);
  }
}