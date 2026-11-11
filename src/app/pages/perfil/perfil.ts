import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent implements OnInit {
  usuarioEmail: string = '';
  nombrePiloto: string = '';
  nuevaPassword: string = '';

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    
    if (!user || (!user.email && !user.id)) {
      alert("Debes iniciar sesión para acceder a tu perfil.");
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioEmail = user.email || '';
    // Lee directamente 'name' que viene de tu base de datos MySQL (tabla users)
    this.nombrePiloto = user.name || user.nombrePiloto || 'Piloto Voltex';
  }

  guardarCambiosPerfil() {
    const usuarioActual: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    const userId = usuarioActual?.id || usuarioActual?.userId || 1;

    const datosActualizados: any = {
      name: this.nombrePiloto,
      email: this.usuarioEmail,
    };

    // Solo mandamos la contraseña si el piloto escribió una nueva
    if (this.nuevaPassword && this.nuevaPassword.trim().length > 0) {
      if (this.nuevaPassword.length < 8 || this.nuevaPassword.length > 15) {
        alert("⚠️ La contraseña debe tener entre 8 y 15 caracteres.");
        return;
      }
      datosActualizados.password = this.nuevaPassword;
    }

    console.log("💾 GUARDANDO CAMBIOS DE PERFIL:", datosActualizados);

    // Llamada opcional a tu API si tienes un endpoint de actualización (ej. put /users o /perfil)
    // this.voltexApi.actualizarPerfil(userId, datosActualizados).subscribe({...});

    // Actualizamos el estado global del usuario en el cliente
    if (typeof this.state.usuarioActual === 'function' && 'set' in this.state.usuarioActual) {
      this.state.usuarioActual.set({
        ...usuarioActual,
        name: this.nombrePiloto,
        email: this.usuarioEmail
      });
    }

    alert("⚙️ ¡Datos del piloto actualizados con éxito!");
    this.nuevaPassword = ''; // Limpiamos el campo de contraseña por seguridad
    this.cdr.detectChanges();
  }

  cerrarSesion() {
    const estadoGlobal: any = this.state;
    
    if (typeof estadoGlobal.usuarioActual === 'function' && 'set' in estadoGlobal.usuarioActual) {
      estadoGlobal.usuarioActual.set(null);
    } else {
      estadoGlobal.usuarioActual = null;
    }
    
    console.log("🔒 Sesión cerrada correctamente.");
    this.router.navigate(['/login']);
  }
}