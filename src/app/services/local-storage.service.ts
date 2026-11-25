import { Injectable } from '@angular/core';

export interface AccionOfflinePendiente {
  id: string;
  tipo: string; // ej. 'crear-pedido', 'crear-producto', 'guardar-manual', etc.
  payload: any;
  creadoEn: string;
}

export interface PeticionHttpOffline {
  id: string;
  method: string;
  url: string;
  body: any;
  creadoEn: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly STORAGE_KEY = '7voltex_offline_data';
  private readonly QUEUE_KEY = '7voltex_cola_pendiente';
  private readonly HTTP_CACHE_PREFIX = '7voltex_get_cache_';
  private readonly HTTP_QUEUE_KEY = '7voltex_http_queue';

  private leerJsonSeguro<T>(clave: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(clave);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`JSON corrupto detectado en "${clave}", limpiando clave de forma segura.`, error);
      localStorage.removeItem(clave);
      return fallback;
    }
  }

  private guardarJsonSeguro(clave: string, valor: unknown): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      console.warn(`No se pudo guardar en localStorage ("${clave}"):`, error);
    }
  }

  // --- Registros offline ---
  public guardarRegistro(item: any): any {
    const actual = this.obtenerRegistros();
    const nuevo = { id: Date.now(), ...item };
    actual.push(nuevo);
    this.guardarJsonSeguro(this.STORAGE_KEY, actual);
    return nuevo;
  }

  public obtenerRegistros(): any[] {
    const data = this.leerJsonSeguro<any[]>(this.STORAGE_KEY, []);
    return Array.isArray(data) ? data : [];
  }

  public actualizarRegistro(id: number, nuevosDatos: any): void {
    const actual = this.obtenerRegistros().map((item) =>
      item.id === id ? { ...item, ...nuevosDatos } : item
    );
    this.guardarJsonSeguro(this.STORAGE_KEY, actual);
  }

  public eliminarRegistro(id: number): void {
    const filtrados = this.obtenerRegistros().filter((item) => item.id !== id);
    this.guardarJsonSeguro(this.STORAGE_KEY, filtrados);
  }

  // --- Cola de acciones para sincronizar cuando regrese el internet ---
  public encolarAccion(tipo: string, payload: any): AccionOfflinePendiente {
    const cola = this.obtenerAccionesPendientes();
    const accion: AccionOfflinePendiente = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tipo,
      payload,
      creadoEn: new Date().toISOString()
    };
    cola.push(accion);
    this.guardarJsonSeguro(this.QUEUE_KEY, cola);
    return accion;
  }

  public obtenerAccionesPendientes(): AccionOfflinePendiente[] {
    const cola = this.leerJsonSeguro<AccionOfflinePendiente[]>(this.QUEUE_KEY, []);
    return Array.isArray(cola) ? cola : [];
  }

  public quitarAccionPendiente(id: string): void {
    const restante = this.obtenerAccionesPendientes().filter((acc) => acc.id !== id);
    this.guardarJsonSeguro(this.QUEUE_KEY, restante);
  }

  // --- Caché de lecturas GET y cola HTTP genérica ---
  public guardarCacheGet(url: string, data: any): void {
    this.guardarJsonSeguro(this.HTTP_CACHE_PREFIX + url, data);
  }

  public obtenerCacheGet(url: string): any | null {
    return this.leerJsonSeguro<any>(this.HTTP_CACHE_PREFIX + url, null);
  }

  public encolarPeticionHttp(method: string, url: string, body: any): PeticionHttpOffline {
    const cola = this.obtenerPeticionesHttpPendientes();
    const item: PeticionHttpOffline = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      method,
      url,
      body,
      creadoEn: new Date().toISOString()
    };
    cola.push(item);
    this.guardarJsonSeguro(this.HTTP_QUEUE_KEY, cola);
    return item;
  }

  public obtenerPeticionesHttpPendientes(): PeticionHttpOffline[] {
    const lista = this.leerJsonSeguro<PeticionHttpOffline[]>(this.HTTP_QUEUE_KEY, []);
    return Array.isArray(lista) ? lista : [];
  }

  public quitarPeticionHttpPendiente(id: string): void {
    const restante = this.obtenerPeticionesHttpPendientes().filter((p) => p.id !== id);
    this.guardarJsonSeguro(this.HTTP_QUEUE_KEY, restante);
  }
}