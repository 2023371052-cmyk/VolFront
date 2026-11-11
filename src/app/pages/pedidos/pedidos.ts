import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class PedidosComponent implements OnInit {
  pedidos: any[] = [];
  usuarioEmail: string | null = null;
  cargando = true;

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef // <--- Refresca la vista al instante
  ) {}

  ngOnInit(): void {
    const user: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    
    if (!user || (!user.email && !user.id)) {
      alert("Debes iniciar sesión para consultar el historial de Pits.");
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioEmail = user.email;
    
    // Usamos el ID del usuario preferentemente (o el correo como respaldo)
    const identifier = user.id || user.userId || user.email;
    this.cargarHistorialPedidos(identifier);
  }

  cargarHistorialPedidos(identifier: string | number) {
    this.cargando = true;

    this.voltexApi.getOrdenesPorUsuario(identifier as any).subscribe({
      next: (data: any) => {
        console.log("📜 HISTORIAL DE ÓRDENES RECIBIDO:", data);
        this.pedidos = Array.isArray(data) ? data : (data.ordenes || data.data || []);
        this.cargando = false;
        this.cdr.detectChanges(); // <--- Fuerza a Angular a pintar los pedidos al instante
      },
      error: (err: any) => {
        console.error('Error al cargar historial de pedidos:', err);
        this.pedidos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // 🌟 Método para descargar el ticket individual en PDF usando impresión nativa limpia
  descargarTicketPdf(pedido: any) {
    // Si tienes una vista o detalle específico, o podemos imprimir la página actual estilizada
    window.print();
  }
}