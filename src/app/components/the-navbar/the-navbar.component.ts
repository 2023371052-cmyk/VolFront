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

  constructor(
    public state: VoltexStateService,
    public router: Router // <--- Cambiado a 'public' para poder usarlo en el HTML
  ) {}

  // Función para cerrar sesión desde la barra de admin
  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}