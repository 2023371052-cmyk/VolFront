import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './registro.component.html',
 styleUrl: './auth.component.css'
})
export class RegistroComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private voltexApi: VoltexApiService,
    private router: Router
  ) {}

  registrarPiloto() {
    this.errorMessage = '';

    if (!this.name || this.name.trim().length < 3) {
      this.errorMessage = 'Por favor ingresa un nombre válido (mínimo 3 caracteres).';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor ingresa un correo electrónico válido.';
      return;
    }

    if (!this.password || this.password.length < 8 || this.password.length > 15) {
      this.errorMessage = 'La contraseña debe tener entre 8 y 15 caracteres.';
      return;
    }

    // Usamos el nombre correcto del método de tu servicio: registrarUsuario
    this.voltexApi.registrarUsuario({
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Éxito: Redirigimos al login
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = response.message || 'No se pudo completar el registro.';
        }
      },
      error: (err: any) => {
        console.error('Error en el servidor:', err);
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor de Pits.';
        }
      }
    });
  }

}