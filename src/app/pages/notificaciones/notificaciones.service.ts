import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
// import { environment } from '../../../environments/environment.prod';
import { environment } from '../../../environments/environment';

export interface NotificacionVoltex {
  id: number | string;
  titulo: string;
  mensaje: string;
  horaProgramada?: string;
  tipo?: string;
  leida: boolean;
  fecha?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private readonly ACTIVE_SESSION_KEY = 'voltex_active_session';
  private readonly NOTIF_CACHE_PREFIX = 'voltex_notif_cache_';
  private readonly NOTIF_ALERTED_PREFIX = 'voltex_notif_alerted_';

  private usuarioIdActual: string = 'invitado';
  private pollingInterval: any = null;
  private primeraCargaHecha: boolean = false;

  private permisoSubject = new BehaviorSubject<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  public permiso$ = this.permisoSubject.asObservable();

  private notificacionesSubject = new BehaviorSubject<NotificacionVoltex[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  private noLeidasSubject = new BehaviorSubject<number>(0);
  public noLeidas$ = this.noLeidasSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refrescarPermiso();
    const sesion = this.obtenerSesionGuardada();
    this.establecerUsuario(sesion?.userId ?? sesion?.email ?? 'invitado');
    this.iniciarMonitoreoSegundoPlano();
  }

  // ==================== CONTROL DE HORA PROGRAMADA ====================

  /**
   * Devuelve true si la notificación debe mostrarse/enviarse ya:
   * - Si no tiene horaProgramada o dice 'Ahora' / 'Reciente', es inmediata.
   * - Si tiene fecha/hora válida, solo devuelve true cuando la hora actual >= horaProgramada.
   */
  public haLlegadoLaHora(horaProgramada?: string, createdAt?: string): boolean {
    if (!horaProgramada) return true;

    const limpio = String(horaProgramada).trim().toLowerCase();
    if (!limpio || limpio === 'ahora' || limpio === 'reciente' || limpio === 'inmediata') {
      return true;
    }

    const timestamp = Date.parse(horaProgramada);
    if (Number.isNaN(timestamp)) {
      return true;
    }

    return timestamp <= Date.now();
  }

  // ==================== ENDPOINTS DE NOTIFICACIONES PUSH ====================

  public getNotificaciones(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/notifications`);
  }

  public enviarNotificacion(notif: {
    titulo: string;
    mensaje: string;
    horaProgramada: string;
    tipo: string;
  }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/notifications`, notif);
  }

  // ==================== PERMISOS Y SESIÓN ACTIVA ====================

  public refrescarPermiso(): NotificationPermission {
    if (typeof Notification === 'undefined') {
      this.permisoSubject.next('denied');
      return 'denied';
    }
    this.permisoSubject.next(Notification.permission);
    return Notification.permission;
  }

  public async solicitarPermisoNotificaciones(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.permisoSubject.next('granted');
      return 'granted';
    }

    try {
      const resultado = await Notification.requestPermission();
      this.permisoSubject.next(resultado);
      return resultado;
    } catch {
      return this.refrescarPermiso();
    }
  }

  public marcarSesionActiva(usuario: any): void {
    if (!usuario) return;

    const userId = String(
      usuario?.id ?? usuario?.userId ?? usuario?.usuarioId ?? usuario?.sub ?? usuario?.email ?? 'invitado'
    );

    const payload = {
      activa: true,
      userId,
      email: usuario?.email || '',
      nombre: usuario?.nombre || usuario?.name || '',
      rol: usuario?.rol || usuario?.role || 'usuario',
      actualizadoEn: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.ACTIVE_SESSION_KEY, JSON.stringify(payload));
    } catch {
      // Ignora errores de almacenamiento
    }

    this.establecerUsuario(userId);
    void this.sincronizarDesdeBackend(false);
  }

  public limpiarSesionActiva(): void {
    try {
      localStorage.removeItem(this.ACTIVE_SESSION_KEY);
    } catch {
      // Ignora errores de almacenamiento
    }
    this.primeraCargaHecha = false;
    this.establecerUsuario('invitado');
  }

  public obtenerSesionGuardada(): any | null {
    try {
      const raw = localStorage.getItem(this.ACTIVE_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.activa ? parsed : null;
    } catch {
      return null;
    }
  }

  public tieneSesionIniciada(): boolean {
    return Boolean(this.obtenerSesionGuardada());
  }

  public establecerUsuario(userId: string | number): void {
    this.usuarioIdActual = String(userId || 'invitado');
    const cache = this.leerCacheLocal().filter((n) => this.haLlegadoLaHora(n.horaProgramada));
    this.emitirLista(cache);
  }

  // ==================== CACHÉ Y ALERTAS ====================

  private getCacheKey(): string {
    return `${this.NOTIF_CACHE_PREFIX}${this.usuarioIdActual}`;
  }

  private getAlertedKey(): string {
    return `${this.NOTIF_ALERTED_PREFIX}${this.usuarioIdActual}`;
  }

  private leerCacheLocal(): NotificacionVoltex[] {
    try {
      const raw = localStorage.getItem(this.getCacheKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private guardarCacheLocal(lista: NotificacionVoltex[]): void {
    try {
      localStorage.setItem(this.getCacheKey(), JSON.stringify(lista));
    } catch {
      // Ignora errores de almacenamiento
    }
  }

  private leerIdsAlertados(): Set<string> {
    try {
      const raw = localStorage.getItem(this.getAlertedKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(parsed) ? parsed.map((v) => String(v)) : []);
    } catch {
      return new Set<string>();
    }
  }

  private guardarIdsAlertados(setIds: Set<string>): void {
    try {
      localStorage.setItem(this.getAlertedKey(), JSON.stringify(Array.from(setIds)));
    } catch {
      // Ignora errores de almacenamiento
    }
  }

  private emitirLista(lista: NotificacionVoltex[]): void {
    const disponibles = lista.filter((n) => this.haLlegadoLaHora(n.horaProgramada));
    this.guardarCacheLocal(disponibles);
    this.notificacionesSubject.next([...disponibles]);
    this.noLeidasSubject.next(disponibles.filter((n) => !n.leida).length);
  }

  private normalizarNotificacion(raw: any): NotificacionVoltex {
    return {
      id: raw?.id,
      titulo: raw?.titulo || 'Aviso 7VOLTEX',
      mensaje: raw?.mensaje || '',
      horaProgramada: raw?.horaProgramada || 'Ahora',
      tipo: raw?.tipo || 'push',
      leida: Boolean(raw?.leida),
      fecha: raw?.created_at || raw?.createdAt || raw?.fecha || raw?.horaProgramada || 'Reciente'
    };
  }

  public async sincronizarDesdeBackend(alertarNuevas: boolean = true): Promise<NotificacionVoltex[]> {
    const url = `${environment.apiUrl}/notifications`;

    try {
      const res: any = await firstValueFrom(this.getNotificaciones());
      const listaRaw = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.notifications)
            ? res.notifications
            : [];

      const normalizadas: NotificacionVoltex[] = listaRaw.map((item: any) =>
        this.normalizarNotificacion(item)
      );

      // Solo se liberan y consideran las notificaciones cuya hora programada ya llegó
      const yaDisponibles = normalizadas.filter((n) => this.haLlegadoLaHora(n.horaProgramada));
      const idsAlertados = new Set<string>(Array.from(this.leerIdsAlertados()));

      if (!this.primeraCargaHecha) {
        yaDisponibles.forEach((n: NotificacionVoltex) => {
          if (n && n.id !== undefined && n.id !== null) {
            idsAlertados.add(String(n.id));
          }
        });
        this.guardarIdsAlertados(idsAlertados);
        this.primeraCargaHecha = true;
      } else if (alertarNuevas && this.tieneSesionIniciada()) {
        for (const notif of yaDisponibles) {
          if (!notif || notif.id === undefined || notif.id === null) continue;
          const idStr = String(notif.id);
          if (!notif.leida && !idsAlertados.has(idStr)) {
            idsAlertados.add(idStr);
            this.guardarIdsAlertados(idsAlertados);
            await this.lanzarNotificacionSistemaPWA(notif);
          }
        }
      }

      this.emitirLista(yaDisponibles);
      return yaDisponibles;
    } catch (error) {
      console.error('Error al obtener notificaciones desde:', url, error);
      const local = this.leerCacheLocal().filter((n) => this.haLlegadoLaHora(n.horaProgramada));
      this.emitirLista(local);
      return local;
    }
  }

  private iniciarMonitoreoSegundoPlano(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Revisa cada 15 segundos para liberar notificaciones puntuales a su hora programada
    this.pollingInterval = setInterval(() => {
      if (this.tieneSesionIniciada()) {
        void this.sincronizarDesdeBackend(true);
      }
    }, 15000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.tieneSesionIniciada()) {
          void this.sincronizarDesdeBackend(true);
        }
      });
    }
  }

  public async lanzarNotificacionSistemaPWA(notif: NotificacionVoltex): Promise<void> {
    if (!this.haLlegadoLaHora(notif.horaProgramada)) return;
    if (typeof Notification === 'undefined' || !this.tieneSesionIniciada()) return;

    const permiso = this.refrescarPermiso();
    if (permiso !== 'granted') return;

    const cuerpo =
      notif.horaProgramada && notif.horaProgramada !== 'Ahora'
        ? `${notif.mensaje} (${notif.horaProgramada})`
        : notif.mensaje;

    const opciones: NotificationOptions = {
      body: cuerpo,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      tag: `voltex-notif-${notif.id}`,
      data: { url: '/notificaciones', id: notif.id }
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(`7VOLTEX · ${notif.titulo}`, opciones);
          return;
        }
      }
    } catch {
      // Respaldo a Notification API estándar
    }

    try {
      new Notification(`7VOLTEX · ${notif.titulo}`, opciones);
    } catch {
      // Ignora si el navegador bloquea el popup
    }
  }

  public async marcarComoLeida(id: number | string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/notifications/leer/${id}`, {})
      );
    } catch {
      // Actualiza estado local de todos modos
    }

    const actualizada = this.leerCacheLocal().map((n) =>
      String(n.id) === String(id) ? { ...n, leida: true } : n
    );
    this.emitirLista(actualizada);
  }

  public async marcarTodasLeidas(): Promise<void> {
    const pendientes = this.leerCacheLocal().filter((n) => !n.leida);
    for (const item of pendientes) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/notifications/leer/${item.id}`, {})
        );
      } catch {
        // Continúa con las demás
      }
    }

    const actualizada = this.leerCacheLocal().map((n) => ({ ...n, leida: true }));
    this.emitirLista(actualizada);
  }

  // Métodos para uso del rol Admin (crear / eliminar)
  public async crearNotificacionAdmin(payload: {
    titulo: string;
    mensaje: string;
    horaProgramada?: string;
    tipo?: string;
  }): Promise<any> {
    const creada = await firstValueFrom(
      this.enviarNotificacion({
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        horaProgramada: payload.horaProgramada || 'Ahora',
        tipo: payload.tipo || 'push'
      })
    );
    await this.sincronizarDesdeBackend(true);
    return creada;
  }

  public async eliminarNotificacionAdmin(id: number | string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/notifications/eliminar/${id}`, {})
    );
    const filtrada = this.leerCacheLocal().filter((n) => String(n.id) !== String(id));
    this.emitirLista(filtrada);
  }
}