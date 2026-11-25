import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

export type ManejadorSincronizacion = (payload: any) => Observable<any>;

@Injectable({
  providedIn: 'root'
})
export class NetworkSyncService {
  private storage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private manejadores = new Map<string, ManejadorSincronizacion>();
  private sincronizando = false;

  readonly enLinea = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  readonly pendientesCount = signal<number>(0);
  readonly estadoSync = signal<string>('');

  constructor() {
    this.refrescarContadorPendientes();
    this.initNetworkListeners();
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.enLinea.set(true);
      this.estadoSync.set('Conexión restablecida. Sincronizando cambios pendientes...');
      void this.sincronizarPedidosPendientes();
    });

    window.addEventListener('offline', () => {
      this.enLinea.set(false);
      this.estadoSync.set('Sin conexión a internet. Tus cambios se guardarán localmente.');
    });
  }

  public registrarManejador(tipo: string, handler: ManejadorSincronizacion): void {
    this.manejadores.set(tipo, handler);
  }

  public refrescarContadorPendientes(): void {
    const acciones = this.storage.obtenerAccionesPendientes().length;
    const httpPendientes = this.storage.obtenerPeticionesHttpPendientes().length;
    this.pendientesCount.set(acciones + httpPendientes);
  }

  public encolarOperacion(tipo: string, payload: any): void {
    this.storage.encolarAccion(tipo, payload);
    this.refrescarContadorPendientes();
    this.estadoSync.set('Acción guardada sin conexión; se enviará al recuperar internet.');
  }

  public async sincronizarPedidosPendientes(): Promise<void> {
    if (this.sincronizando) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enLinea.set(false);
      return;
    }

    this.refrescarContadorPendientes();
    const pendientes = this.storage.obtenerAccionesPendientes();
    const httpCola = this.storage.obtenerPeticionesHttpPendientes();

    if (pendientes.length === 0 && httpCola.length === 0) return;

    this.sincronizando = true;
    try {
      for (const accion of [...pendientes]) {
        const handler = this.manejadores.get(accion.tipo);
        if (!handler) {
          console.warn(`No hay manejador registrado para la acción offline "${accion.tipo}".`);
          continue;
        }

        try {
          await firstValueFrom(handler(accion.payload));
          this.storage.quitarAccionPendiente(accion.id);
          this.refrescarContadorPendientes();
        } catch (err) {
          console.warn(`Reintentará más tarde la acción "${accion.tipo}" (${accion.id}):`, err);
        }
      }

      for (const reqItem of [...httpCola]) {
        try {
          await firstValueFrom(
            this.http.request(reqItem.method, reqItem.url, {
              body: reqItem.body,
              headers: { 'X-Offline-Replay': 'true' }
            })
          );
          this.storage.quitarPeticionHttpPendiente(reqItem.id);
          this.refrescarContadorPendientes();
        } catch (err) {
          console.warn(`Reintentará más tarde ${reqItem.method} ${reqItem.url}:`, err);
        }
      }

      const restantes = this.pendientesCount();
      if (restantes === 0) {
        this.estadoSync.set('Todos los cambios pendientes se sincronizaron correctamente.');
        setTimeout(() => {
          if (this.enLinea() && this.pendientesCount() === 0) {
            this.estadoSync.set('');
          }
        }, 4000);
      } else {
        this.estadoSync.set(`Quedan ${restantes} acción(es) pendiente(s) por sincronizar.`);
      }
    } finally {
      this.sincronizando = false;
      this.refrescarContadorPendientes();
    }
  }
}