import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private STORAGE_KEY = '7voltex_offline_data';

  constructor() {}

  // Alta / Guardar registros
  public guardarRegistro(item: any): void {
    const actual = this.obtenerRegistros();
    actual.push({ id: Date.now(), ...item });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actual));
  }

  // Consulta
  public obtenerRegistros(): any[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Modificación / Actualización
  public actualizarRegistro(id: number, nuevosDatos: any): void {
    let actual = this.obtenerRegistros();
    actual = actual.map(item => item.id === id ? { ...item, ...nuevosDatos } : item);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actual));
  }

  // Baja / Eliminación
  public eliminarRegistro(id: number): void {
    let actual = this.obtenerRegistros();
    actual = actual.filter(item => item.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actual));
  }
}