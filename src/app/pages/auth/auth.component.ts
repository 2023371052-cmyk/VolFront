import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

export type NivelSeguridad = 'vacia' | 'baja' | 'media' | 'segura';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class LoginComponent implements OnInit {
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
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/usuario']);
      }
    }
  }

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

  encenderMotor(): void {
    this.errorMessage = '';

    const correoLimpio = (this.email || '').trim();
    const passLimpia = this.password || '';

    // 1. Validar formato de correo electrónico válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoLimpio || !emailRegex.test(correoLimpio)) {
      this.errorMessage = 'Usuario incorrecto';
      return;
    }

    // 2. Validar que la contraseña tenga entre 8 y 15 caracteres
    if (!passLimpia || passLimpia.length < 8 || passLimpia.length > 15) {
      this.errorMessage = 'Usuario incorrecto';
      return;
    }

    // 3. Petición al backend enviando credenciales completas
    this.voltexApi.login({ email: correoLimpio, password: passLimpia }).subscribe({
      next: (response) => {
        if (response?.success) {
          const userData = response.user || response.usuario || response;
          const userId = userData?.id ?? userData?.userId ?? response?.id ?? response?.userId ?? null;

          this.state.usuarioActual.set({
            ...userData,
            id: userId !== null && userId !== undefined ? Number(userId) : null,
            email: userData?.email || response?.email || correoLimpio,
            name: userData?.name ?? userData?.nombre ?? '',
            role: userData?.role || response?.role || 'client'
          });

          if ((userData?.role || response?.role) === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/usuario']);
          }
        } else {
          this.errorMessage = 'Usuario incorrecto';
        }
      },
      error: (err: any) => {
        console.error('Error del servidor:', err);

        // Si el servidor respondió con error de autenticación (400 / 401 / 403 / 404)
        if (err?.status === 400 || err?.status === 401 || err?.status === 403 || err?.status === 404) {
          this.errorMessage = 'Usuario incorrecto';
        } else if (err?.status === 0 || !err?.status) {
          this.errorMessage = 'No se pudo conectar con el servidor de Pits.';
        } else {
          this.errorMessage = 'Usuario incorrecto';
        }
      }
    });
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }
}