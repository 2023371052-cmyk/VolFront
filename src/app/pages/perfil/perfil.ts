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
  private readonly avatarPorDefecto: string = '/avatars/hombre3.jpg';

  usuarioEmail: string = '';
  nombrePiloto: string = '';
  nuevaPassword: string = '';
  mostrarPassword: boolean = false;

  avataresDisponibles: any[] = [];
  avatarSeleccionado: string = this.avatarPorDefecto;
  cargandoAvatares: boolean = false;

  guardando: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  private normalizarAvatarUrl(url?: string | null): string {
    const limpia = (url || '').trim();
    if (!limpia || limpia.includes('assets/avatars/')) {
      return this.avatarPorDefecto;
    }
    return limpia;
  }

  private obtenerUsuarioActual(): any {
    const estadoGlobal: any = this.state;
    let user: any =
      typeof estadoGlobal?.usuarioActual === 'function'
        ? estadoGlobal.usuarioActual()
        : (estadoGlobal?.usuarioActual || estadoGlobal?.usuario || estadoGlobal?.currentUser || null);

    if (!user || (!user.id && !user.userId && !user.usuarioId && !user.sub)) {
      try {
        const keys = ['voltex_user', 'usuarioActual', 'usuario', 'user'];
        for (const key of keys) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.id || parsed.userId || parsed.usuarioId || parsed.sub || parsed.email)) {
              user = { ...(user || {}), ...parsed };
              break;
            }
          }
        }
      } catch {
        // Ignora errores de acceso a localStorage
      }
    }

    return user || {};
  }

  private persistirUsuarioLocal(usuarioActualizado: any): void {
    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal?.usuarioActual === 'function' && 'set' in estadoGlobal.usuarioActual) {
      estadoGlobal.usuarioActual.set(usuarioActualizado);
    } else if (estadoGlobal) {
      estadoGlobal.usuarioActual = usuarioActualizado;
    }

    try {
      const keys = ['voltex_user', 'usuarioActual', 'usuario', 'user'];
      for (const key of keys) {
        if (localStorage.getItem(key) !== null) {
          localStorage.setItem(key, JSON.stringify(usuarioActualizado));
        }
      }
    } catch {
      // Ignora errores de escritura en localStorage
    }
  }

  ngOnInit(): void {
    const user: any = this.obtenerUsuarioActual();
    const rawId = user?.id ?? user?.userId ?? user?.usuarioId ?? user?.sub ?? null;

    if (!user || (!user.email && !rawId)) {
      alert('Debes iniciar sesión para acceder a tu perfil.');
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioEmail = user.email || '';
    this.nombrePiloto = user.name || user.nombrePiloto || 'Piloto Voltex';
    this.avatarSeleccionado = this.normalizarAvatarUrl(user.avatarUrl ?? user.avatar_url);

    this.cargarAvataresPredeterminados();
  }

  cargarAvataresPredeterminados(): void {
    const api: any = this.voltexApi;
    if (typeof api?.getAvatars !== 'function') {
      return;
    }

    this.cargandoAvatares = true;
    api.getAvatars().subscribe({
      next: (lista: any) => {
        this.avataresDisponibles = Array.isArray(lista)
          ? lista
          : (lista?.avatars || lista?.data || []);

        if (this.avataresDisponibles.length > 0) {
          const coincide = this.avataresDisponibles.some(
            (av: any) => av.imageUrl === this.avatarSeleccionado
          );
          if (!coincide) {
            const avatarGuardado = this.obtenerUsuarioActual()?.avatarUrl;
            const guardadoValido = this.avataresDisponibles.some(
              (av: any) => av.imageUrl === avatarGuardado
            );
            this.avatarSeleccionado = guardadoValido
              ? avatarGuardado
              : this.avataresDisponibles[0].imageUrl;
          }
        }

        this.cargandoAvatares = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ Error al cargar avatares predeterminados:', err);
        this.avataresDisponibles = [];
        this.cargandoAvatares = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarAvatar(imageUrl: string): void {
    this.avatarSeleccionado = this.normalizarAvatarUrl(imageUrl);
    this.mensajeError = '';
  }

  guardarCambiosPerfil(): void {
    this.mensajeExito = '';
    this.mensajeError = '';

    const nombreLimpio = (this.nombrePiloto || '').trim();
    const emailLimpio = (this.usuarioEmail || '').trim();
    const passwordLimpia = (this.nuevaPassword || '').trim();

    if (!nombreLimpio) {
      this.mensajeError = 'El nombre de piloto no puede quedar vacío.';
      return;
    }

    if (!emailLimpio || !emailLimpio.includes('@')) {
      this.mensajeError = 'Ingresa un correo electrónico válido.';
      return;
    }

    const usuarioActual = this.obtenerUsuarioActual();
    const rawId =
      usuarioActual?.id ??
      usuarioActual?.userId ??
      usuarioActual?.usuarioId ??
      usuarioActual?.sub ??
      null;
    const userId = Number(rawId);

    if (!rawId || Number.isNaN(userId) || userId <= 0) {
      this.mensajeError = 'No se encontró un ID de usuario válido en la sesión. Vuelve a iniciar sesión.';
      return;
    }

    const avatarAEnviar = this.normalizarAvatarUrl(this.avatarSeleccionado);

    const datosActualizados: any = {
      name: nombreLimpio,
      email: emailLimpio,
      avatarUrl: avatarAEnviar
    };

    const cambiaPassword = passwordLimpia.length > 0;
    if (cambiaPassword) {
      if (passwordLimpia.length < 8 || passwordLimpia.length > 15) {
        this.mensajeError = 'La nueva contraseña debe tener entre 8 y 15 caracteres.';
        return;
      }
      datosActualizados.password = passwordLimpia;
    }

    const api: any = this.voltexApi;
    const metodoApi =
      api?.actualizarPerfil || api?.actualizarUsuario || api?.updateUsuario || null;

    const aplicarActualizacionLocal = (respuestaApi?: any) => {
      if (respuestaApi && respuestaApi.success === false) {
        this.guardando = false;
        this.mensajeError = respuestaApi.message || 'No se pudieron guardar los cambios.';
        this.cdr.detectChanges();
        return;
      }

      const usuarioBase = respuestaApi?.user || respuestaApi?.usuario || respuestaApi || {};
      const nuevoUsuario = {
        ...usuarioActual,
        ...usuarioBase,
        id: usuarioActual?.id ?? usuarioBase?.id ?? userId,
        name: usuarioBase?.name ?? nombreLimpio,
        email: usuarioBase?.email ?? emailLimpio,
        avatarUrl: this.normalizarAvatarUrl(usuarioBase?.avatarUrl ?? avatarAEnviar)
      };
      delete nuevoUsuario.password;

      this.nombrePiloto = nuevoUsuario.name;
      this.usuarioEmail = nuevoUsuario.email;
      this.avatarSeleccionado = nuevoUsuario.avatarUrl;
      this.persistirUsuarioLocal(nuevoUsuario);

      this.nuevaPassword = '';
      this.mostrarPassword = false;
      this.guardando = false;
      this.mensajeExito = cambiaPassword
        ? 'Perfil, avatar y contraseña actualizados con éxito.'
        : 'Perfil y avatar actualizados con éxito.';
      this.cdr.detectChanges();
    };

    if (typeof metodoApi === 'function') {
      this.guardando = true;
      metodoApi.call(this.voltexApi, userId, datosActualizados).subscribe({
        next: (res: any) => aplicarActualizacionLocal(res),
        error: (err: any) => {
          console.error('❌ Error al actualizar perfil:', err);
          this.guardando = false;
          this.mensajeError =
            err?.error?.message ||
            'No se pudieron guardar los cambios en el servidor. Intenta de nuevo.';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    aplicarActualizacionLocal();
  }

  cerrarSesion(): void {
    const estadoGlobal: any = this.state;

    if (typeof estadoGlobal?.usuarioActual === 'function' && 'set' in estadoGlobal.usuarioActual) {
      estadoGlobal.usuarioActual.set(null);
    } else if (estadoGlobal) {
      estadoGlobal.usuarioActual = null;
    }

    try {
      const keys = ['voltex_user', 'usuarioActual', 'usuario', 'user', 'token', 'voltex_token'];
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignora errores de acceso a localStorage
    }

    console.log('🔒 Sesión cerrada correctamente.');
    this.router.navigate(['/login']);
  }
}