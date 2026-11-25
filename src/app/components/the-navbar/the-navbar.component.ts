import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-the-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './the-navbar.component.html',
  styleUrl: './the-navbar.component.css'
})
export class TheNavbarComponent {
  terminoBusqueda: string = '';

  constructor(
    public state: VoltexStateService,
    public router: Router // <--- Cambiado a 'public' para poder usarlo en el HTML
  ) {}

  onBuscar(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.actualizarBusqueda(input?.value ?? '');
  }

  limpiarBusqueda(): void {
    this.actualizarBusqueda('');
  }

  irATiendaSiNoEsta(): void {
    if (!this.router.url.includes('/tienda')) {
      this.router.navigate(['/tienda']);
    }
  }

  private actualizarBusqueda(valor: string): void {
    this.terminoBusqueda = valor;
    const estadoGlobal: any = this.state;

    if (typeof estadoGlobal.setBusqueda === 'function') {
      estadoGlobal.setBusqueda(valor);
    } else if (typeof estadoGlobal.busqueda?.set === 'function') {
      estadoGlobal.busqueda.set(valor);
    } else {
      estadoGlobal.terminoBusqueda = valor;
    }
  }

  // Función para cerrar sesión desde la barra de admin
  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}