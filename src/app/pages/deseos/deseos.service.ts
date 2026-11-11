import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class deseosService {
  private STORAGE_KEY = 'voltex_wishlist';

  // CONSULTA (Read): Obtener todos los elementos guardados localmente
  obtenerDeseos(): any[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // ALTA (Create): Agregar un componente a la lista de deseos
  agregarADeseos(producto: any): void {
    const deseos = this.obtenerDeseos();
    // Validamos que no esté duplicado
    if (!deseos.some(p => p.id === producto.id)) {
      deseos.push(producto);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deseos));
    }
  }

  // BAJA (Delete): Eliminar un producto por su ID
  eliminarDeDeseos(id: number | string): void {
    let deseos = this.obtenerDeseos();
    deseos = deseos.filter(p => p.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deseos));
  }

  // CONSULTA AUXILIAR: Verificar si un producto ya está en favoritos
  esFavorito(id: number | string): boolean {
    const deseos = this.obtenerDeseos();
    return deseos.some(p => p.id === id);
  }
}