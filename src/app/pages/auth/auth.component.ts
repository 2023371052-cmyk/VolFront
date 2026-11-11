import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // <--- Agregamos RouterModule aquí
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // <--- Y lo incluimos en los imports
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

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

  encenderMotor() {
    this.errorMessage = '';

    // 1. Validar formato de correo electrónico válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor ingresa un correo electrónico válido.';
      return;
    }

    // 2. Validar que la contraseña tenga entre 8 y 15 caracteres
    if (!this.password || this.password.length < 8 || this.password.length > 15) {
      this.errorMessage = 'La contraseña debe tener entre 8 y 15 caracteres.';
      return;
    }

    // 3. Petición al backend enviando credenciales completas
    this.voltexApi.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        if (response.success) {
          this.state.usuarioActual.set({
            email: response.user.email,
            role: response.user.role
          });

          if (response.user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/usuario']);
          }
        } else {
          this.errorMessage = response.message || 'Credenciales incorrectas.';
        }
      },
      error: (err: any) => {
        console.error('Error del servidor:', err);
        
        if (err.error && err.error.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor de Pits.';
        }
      }
    });
  }

  // Método auxiliar para redireccionar al registro si usas la opción por código
  irARegistro() {
    this.router.navigate(['/registro']);
  }
}