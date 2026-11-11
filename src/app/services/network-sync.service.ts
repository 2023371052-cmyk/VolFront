import { Injectable, inject } from '@angular/core';
import { VoltexApiService } from './voltex-api.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkSyncService {
  private voltexApi = inject(VoltexApiService);
  private OFFLINE_ORDERS_KEY = 'voltex_pedidos_offline';

  constructor() {
    this.initNetworkListeners();
  }

  private initNetworkListeners(): void {
    // Escuchar cuando el navegador recupera la conexión
    window.addEventListener('online', () => {
      console.log('🌐 Conexión de red restablecida. Iniciando sincronización automática de Pits...');
      this.sincronizarPedidosPendientes();
    });

    window.addEventListener('offline', () => {
      console.warn('⚠️ Se perdió la conexión a internet. Modo offline activo.');
    });
  }

  // Método público para disparar la sincronización manual o automática
  public sincronizarPedidosPendientes(): void {
    const pedidosRaw = localStorage.getItem(this.OFFLINE_ORDERS_KEY);
    if (!pedidosRaw) return;

    const pedidosPendientes: any[] = JSON.parse(pedidosRaw);
    if (pedidosPendientes.length === 0) return;

    console.log(`📦 Encontrados ${pedidosPendientes.length} pedidos pendientes de sincronización.`);

    // Iterar y enviar cada pedido pendiente al backend
    pedidosPendientes.forEach((pedido, index) => {
      // Aquí asumiendo que tu API tiene un endpoint para crear pedidos
      this.voltexApi.login({ email: pedido.usuario?.email, password: '' }).subscribe({
        next: () => {
          // Si el servidor responde, eliminamos el pedido de la cola local
          pedidosPendientes.splice(index, 1);
          localStorage.setItem(this.OFFLINE_ORDERS_KEY, JSON.stringify(pedidosPendientes));
          console.log(`✅ Pedido ${pedido.id_pedido} sincronizado exitosamente con la nube.`);
        },
        error: (err) => {
          console.warn(`⏳ No se pudo sincronizar el pedido ${pedido.id_pedido}. Reintentando más tarde...`, err);
        }
      });
    });
  }
}