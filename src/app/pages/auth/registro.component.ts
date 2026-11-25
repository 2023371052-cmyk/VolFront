import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';

export type NivelSeguridad = 'vacia' | 'baja' | 'media' | 'segura';

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
  mostrarPassword: boolean = false;

  // Indicador de seguridad de contraseña
  nivelSeguridad: NivelSeguridad = 'vacia';
  etiquetaSeguridad: string = '';
  tieneLongitudMinima: boolean = false;
  tieneMayuscula: boolean = false;
  tieneNumero: boolean = false;
  tieneCaracterEspecial: boolean = false;

  constructor(
    private voltexApi: VoltexApiService,
    private router: Router
  ) {}

  alternarVisibilidadPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  evaluarSeguridadPassword(valor: string): void {
    const pass = valor || '';

    if (!pass) {
      this.nivelSeguridad = 'vacia';
      this.etiquetaSeguridad = '';
      this.tieneLongitudMinima = false;
      this.tieneMayuscula = false;
      this.tieneNumero = false;
      this.tieneCaracterEspecial = false;
      return;
    }

    this.tieneLongitudMinima = pass.length >= 8 && pass.length <= 15;
    this.tieneMayuscula = /[A-Z]/.test(pass);
    this.tieneNumero = /\d/.test(pass);
    this.tieneCaracterEspecial = /[^A-Za-z0-9]/.test(pass);

    const criteriosCumplidos = [
      this.tieneLongitudMinima,
      this.tieneMayuscula,
      this.tieneNumero,
      this.tieneCaracterEspecial
    ].filter(Boolean).length;

    if (criteriosCumplidos >= 4) {
      this.nivelSeguridad = 'segura';
      this.etiquetaSeguridad = 'Segura';
    } else if (criteriosCumplidos >= 2 && pass.length >= 6) {
      this.nivelSeguridad = 'media';
      this.etiquetaSeguridad = 'Media';
    } else {
      this.nivelSeguridad = 'baja';
      this.etiquetaSeguridad = 'Baja';
    }
  }

  registrarPiloto(): void {
    this.errorMessage = '';

    const nombreLimpio = (this.name || '').trim();
    const correoLimpio = (this.email || '').trim();
    const passLimpia = this.password || '';

    if (!nombreLimpio || nombreLimpio.length < 3) {
      this.errorMessage = 'Por favor ingresa un nombre válido (mínimo 3 caracteres).';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoLimpio || !emailRegex.test(correoLimpio)) {
      this.errorMessage = 'Por favor ingresa un correo electrónico válido.';
      return;
    }

    if (!passLimpia || passLimpia.length < 8 || passLimpia.length > 15) {
      this.errorMessage = 'La contraseña debe tener entre 8 y 15 caracteres.';
      return;
    }

    // Usamos el nombre correcto del método de tu servicio: registrarUsuario
    this.voltexApi.registrarUsuario({
      name: nombreLimpio,
      email: correoLimpio,
      password: passLimpia
    }).subscribe({
      next: (response: any) => {
        if (response?.success) {
          // Éxito: Redirigimos al login
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = response?.message || 'No se pudo completar el registro.';
        }
      },
      error: (err: any) => {
        console.error('Error en el servidor:', err);
        if (err?.error && err?.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor de Pits.';
        }
      }
    });
  }
}