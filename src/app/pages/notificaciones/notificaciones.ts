import { Component, OnInit, OnDestroy, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificacionesService, NotificacionVoltex } from './notificaciones.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notificaciones.html',
  styleUrls: ['./notificaciones.css']
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  private relojVistaInterval: any = null;

  notificaciones: NotificacionVoltex[] = [];
  permisoNotificacion: NotificationPermission = 'default';
  sesionActiva: boolean = false;
  usuarioLabel: string = '';
  estadoPermisoMsg: string = '';
  cargando: boolean = false;

  constructor(
    private notifService: NotificacionesService,
    private cdr: ChangeDetectorRef,
    @Optional() private state?: VoltexStateService
  ) {}

  async ngOnInit(): Promise<void> {
    this.sincronizarSesion();

    this.subs.add(
      this.notifService.notificaciones$.subscribe((lista) => {
        this.notificaciones = lista || [];
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.notifService.permiso$.subscribe((permiso) => {
        this.permisoNotificacion = permiso;
        this.cdr.detectChanges();
      })
    );

    if (this.sesionActiva && this.notifService.refrescarPermiso() === 'default') {
      await this.solicitarPermiso();
    }

    await this.actualizarNotificaciones();

    // Refresca la vista cada 15s por si alguna notificación programada acaba de cumplir su hora
    this.relojVistaInterval = setInterval(() => {
      if (this.sesionActiva) {
        void this.notifService.sincronizarDesdeBackend(true);
      }
    }, 15000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.relojVistaInterval) {
      clearInterval(this.relojVistaInterval);
      this.relojVistaInterval = null;
    }
  }

  private sincronizarSesion(): void {
    const estadoGlobal: any = this.state;
    const user =
      typeof estadoGlobal?.usuarioActual === 'function'
        ? estadoGlobal.usuarioActual()
        : (estadoGlobal?.usuarioActual || this.notifService.obtenerSesionGuardada());

    if (user && (user.email || user.id || user.userId || user.usuarioId || user.sub)) {
      this.notifService.marcarSesionActiva(user);
      this.sesionActiva = true;
      this.usuarioLabel = user.email || user.nombre || user.name || 'Piloto';
    } else {
      this.sesionActiva = this.notifService.tieneSesionIniciada();
      const guardada = this.notifService.obtenerSesionGuardada();
      this.usuarioLabel = guardada?.email || guardada?.nombre || '';
    }
  }

  async solicitarPermiso(): Promise<void> {
    const estado = await this.notifService.solicitarPermisoNotificaciones();
    this.permisoNotificacion = estado;

    if (estado === 'granted') {
      this.estadoPermisoMsg = 'Notificaciones activadas. Si tienes sesión iniciada, recibirás avisos incluso con la PWA cerrada.';
    } else if (estado === 'denied') {
      this.estadoPermisoMsg = 'Permiso bloqueado en el navegador. Actívalo desde los ajustes del sitio.';
    } else {
      this.estadoPermisoMsg = 'Permiso pendiente de confirmación.';
    }
    this.cdr.detectChanges();
  }

  async actualizarNotificaciones(): Promise<void> {
    this.cargando = true;
    this.cdr.detectChanges();
    await this.notifService.sincronizarDesdeBackend(true);
    this.cargando = false;
    this.cdr.detectChanges();
  }

  async marcarLeida(id: number | string): Promise<void> {
    await this.notifService.marcarComoLeida(id);
  }

  async marcarTodas(): Promise<void> {
    await this.notifService.marcarTodasLeidas();
  }
}