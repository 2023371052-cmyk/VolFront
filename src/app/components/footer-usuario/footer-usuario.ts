import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-footer-usuario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer-usuario.html',
  styleUrl: './footer-usuario.css'
})
export class FooterUsuario {

  constructor(
    private state: VoltexStateService,
    private router: Router
  ) {}

  cerrarSesion() {
    // 1. Limpiamos el estado del usuario en el servicio global
    this.state.usuarioActual.set(null);

    // 2. Lanzamos la notificación simulada al reloj/wearable
    this.state.lanzarNotificacion(
      'SESIÓN CERRADA',
      'El piloto ha salido del sistema técnico.',
      'push'
    );

    // 3. Redirigimos al Login inmediatamente
    this.router.navigate(['/login']);
  }

  accionProximamente(modulo: string) {
    if (modulo === 'Mi Perfil' || modulo === 'Perfil') {
      this.router.navigate(['/perfil']);
    } else if (modulo === 'Lista de Deseos' || modulo === 'Deseos') {
      this.router.navigate(['/deseos']);
    } else if (modulo === 'Ver Carrito' || modulo === 'Checkout') {
      this.router.navigate(['/checkout']);
    } else if (modulo === 'Mis Pedidos') {
      this.router.navigate(['/pedidos']);
    } else {
      this.state.lanzarNotificacion(
        'ACCESO AL MÓDULO',
        `Cargando interfaz de: ${modulo}...`,
        'push'
      );
    }
  }
}