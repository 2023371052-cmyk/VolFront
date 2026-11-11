import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComparadorService {
  private STORAGE_KEY = 'voltex_comparar_ids';
  private idsSubject = new BehaviorSubject<number[]>(this.obtenerIdsGuardados());
  public ids$ = this.idsSubject.asObservable();

  private obtenerIdsGuardados(): number[] {
    const guardados = sessionStorage.getItem(this.STORAGE_KEY);
    return guardados ? JSON.parse(guardados) : [];
  }

  public agregarId(id: number): boolean {
    let actual = this.obtenerIdsGuardados();
    
    // Asegurarnos de que el ID sea un número válido
    const numericId = Number(id);
    if (isNaN(numericId)) return false;

    // Verificar si ya está en la lista
    if (actual.includes(numericId)) {
      alert('Este supercargador ya está agregado a la tabla de comparación.');
      return false;
    }

    // Permitir comparar de 2 a máximo 3 productos
    if (actual.length >= 3) {
      alert('Solo puedes comparar un máximo de 3 supercargadores al mismo tiempo. Elimina uno para agregar otro.');
      return false;
    }
    
    actual.push(numericId);
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(actual)); // Cambiado a sessionStorage
    this.idsSubject.next(actual);
    return true;
  }

  public removerId(id: number): void {
    let actual = this.obtenerIdsGuardados();
    actual = actual.filter(itemId => itemId !== id);
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(actual)); // Cambiado a sessionStorage
    this.idsSubject.next(actual);
  }

  public limpiarComparacion(): void {
    sessionStorage.removeItem(this.STORAGE_KEY); // Cambiado a sessionStorage
    this.idsSubject.next([]);
  }
}