import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComparadorService {
  private readonly GUEST_STORAGE_KEY = 'voltex_comparar_ids_guest';
  private readonly LEGACY_STORAGE_KEY = 'voltex_comparar_ids';
  private readonly USER_STORAGE_PREFIX = 'voltex_comparar_ids_user_';
  private readonly USER_STORAGE_KEY = 'voltex_comparar_usuario';

  private usuarioIdActual: string = 'invitado';
  private idsSubject = new BehaviorSubject<number[]>([]);
  public ids$ = this.idsSubject.asObservable();

  constructor() {
    this.refrescarSesion();
  }

  public detectarUsuarioActivo(): string {
    try {
      const posiblesClaves = [
        'voltex_user',
        'usuarioActual',
        'user',
        'sessionUser',
        'currentUser',
        'auth_user',
        'usuario'
      ];

      for (const clave of posiblesClaves) {
        const rawLocal = localStorage.getItem(clave);
        const rawSession = sessionStorage.getItem(clave);
        const raw = rawLocal || rawSession;

        if (raw) {
          const parsed = JSON.parse(raw);
          const id =
            parsed?.id ??
            parsed?.userId ??
            parsed?.usuarioId ??
            parsed?.sub ??
            parsed?.email ??
            parsed?.correo ??
            null;

          if (id !== null && id !== undefined && String(id).trim() !== '') {
            const limpio = String(id).trim();
            if (limpio.toLowerCase() !== 'invitado') {
              return limpio;
            }
          }
        }
      }
    } catch {
      // Ignora errores de acceso a almacenamiento
    }
    return 'invitado';
  }

  private getClaveUsuario(userId: string): string {
    return `${this.USER_STORAGE_PREFIX}${userId}`;
  }

  private getClaveActual(): string {
    return this.tieneSesionActiva()
      ? this.getClaveUsuario(this.usuarioIdActual)
      : this.GUEST_STORAGE_KEY;
  }

  public establecerUsuario(userId?: string | number | null): void {
    const detectado = this.detectarUsuarioActivo();
    const candidato =
      userId !== null && userId !== undefined && String(userId).trim() !== ''
        ? String(userId).trim()
        : detectado;

    // Si se pasa 'invitado' pero ya hay un usuario detectado en storage, respeta al usuario logueado
    const nuevoId =
      candidato.toLowerCase() === 'invitado' && detectado !== 'invitado'
        ? detectado
        : candidato;

    let usuarioPrevio: string | null = null;
    try {
      usuarioPrevio = sessionStorage.getItem(this.USER_STORAGE_KEY);
      sessionStorage.setItem(this.USER_STORAGE_KEY, nuevoId);
    } catch {
      // Ignora errores de almacenamiento
    }

    const cambioDeUsuario =
      usuarioPrevio !== null &&
      usuarioPrevio !== '' &&
      usuarioPrevio !== nuevoId;

    this.usuarioIdActual = nuevoId;

    if (nuevoId !== 'invitado') {
      const claveUsuario = this.getClaveUsuario(nuevoId);
      const actualesUsuario = this.leerIdsDesdeStorage(claveUsuario, 'local');
      const enMemoria = this.idsSubject.getValue();
      const enGuest = this.leerIdsDesdeStorage(this.GUEST_STORAGE_KEY, 'session');
      const enLegacy = this.leerIdsDesdeStorage(this.LEGACY_STORAGE_KEY, 'session');

      const combinados = Array.from(
        new Set([...actualesUsuario, ...enMemoria, ...enGuest, ...enLegacy])
      ).slice(0, 3);

      this.limpiarStorageInvitado();
      this.guardarYNotificar(combinados);
      return;
    }

    if (cambioDeUsuario && nuevoId === 'invitado') {
      this.limpiarStorageInvitado();
      this.idsSubject.next([]);
      return;
    }

    this.idsSubject.next(this.obtenerIdsGuardados());
  }

  public refrescarSesion(): void {
    this.establecerUsuario(this.detectarUsuarioActivo());
  }

  public obtenerIdsSincronizados(userId?: string | number | null): number[] {
    if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
      this.establecerUsuario(userId);
    } else {
      this.refrescarSesion();
    }

    const ids = this.obtenerIdsGuardados();
    this.idsSubject.next(ids);
    return ids;
  }

  public getUsuarioIdActual(): string {
    return this.usuarioIdActual;
  }

  public tieneSesionActiva(): boolean {
    return this.usuarioIdActual !== 'invitado';
  }

  private leerIdsDesdeStorage(clave: string, tipo: 'local' | 'session'): number[] {
    try {
      const storage = tipo === 'local' ? localStorage : sessionStorage;
      const guardados = storage.getItem(clave);
      if (!guardados) return [];
      const parsed = JSON.parse(guardados);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((val) => Number(val))
        .filter((num) => !isNaN(num))
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  private obtenerIdsGuardados(): number[] {
    if (this.tieneSesionActiva()) {
      const idsLocal = this.leerIdsDesdeStorage(this.getClaveActual(), 'local');
      if (idsLocal.length > 0) return idsLocal;

      // Rescate si había IDs en memoria o sessionStorage antes de sincronizar
      const rescate = Array.from(
        new Set([
          ...this.idsSubject.getValue(),
          ...this.leerIdsDesdeStorage(this.GUEST_STORAGE_KEY, 'session'),
          ...this.leerIdsDesdeStorage(this.LEGACY_STORAGE_KEY, 'session')
        ])
      ).slice(0, 3);

      if (rescate.length > 0) {
        this.guardarYNotificar(rescate);
      }
      return rescate;
    }

    const guest = this.leerIdsDesdeStorage(this.GUEST_STORAGE_KEY, 'session');
    if (guest.length > 0) return guest;
    return this.leerIdsDesdeStorage(this.LEGACY_STORAGE_KEY, 'session');
  }

  public getIdsActuales(): number[] {
    return this.idsSubject.getValue();
  }

  private guardarYNotificar(lista: number[]): void {
    const limpia = Array.from(new Set(lista)).slice(0, 3);
    try {
      if (this.tieneSesionActiva()) {
        localStorage.setItem(this.getClaveActual(), JSON.stringify(limpia));
      } else {
        sessionStorage.setItem(this.GUEST_STORAGE_KEY, JSON.stringify(limpia));
      }
      sessionStorage.setItem(this.USER_STORAGE_KEY, this.usuarioIdActual);
    } catch {
      // Ignora errores de almacenamiento si no está disponible
    }
    this.idsSubject.next(limpia);
  }

  public limpiarSiEsInvitadoAlSalir(): void {
    const detectado = this.detectarUsuarioActivo();
    if (detectado !== 'invitado') {
      this.establecerUsuario(detectado);
      return;
    }

    if (!this.tieneSesionActiva()) {
      this.limpiarStorageInvitado();
      this.idsSubject.next([]);
    }
  }

  private limpiarStorageInvitado(): void {
    try {
      sessionStorage.removeItem(this.GUEST_STORAGE_KEY);
      sessionStorage.removeItem(this.LEGACY_STORAGE_KEY);
    } catch {
      // Ignora errores de almacenamiento
    }
  }

  public agregarId(id: number): boolean {
    const detected = this.detectarUsuarioActivo();
    if (detected !== 'invitado') {
      this.establecerUsuario(detected);
    }

    const actual = this.obtenerIdsGuardados();
    const numericId = Number(id);
    if (isNaN(numericId)) return false;

    if (actual.includes(numericId)) {
      alert('Este supercargador ya está agregado a la tabla de comparación.');
      return false;
    }

    if (actual.length >= 3) {
      alert('Solo puedes comparar un máximo de 3 supercargadores al mismo tiempo. Elimina uno para agregar otro.');
      return false;
    }

    actual.push(numericId);
    this.guardarYNotificar(actual);
    return true;
  }

  public removerId(id: number): void {
    const detected = this.detectarUsuarioActivo();
    if (detected !== 'invitado') {
      this.establecerUsuario(detected);
    }

    const numericId = Number(id);
    const actual = this.obtenerIdsGuardados().filter((itemId) => itemId !== numericId);
    this.guardarYNotificar(actual);
  }

  public limpiarComparacion(): void {
    const detected = this.detectarUsuarioActivo();
    if (detected !== 'invitado') {
      this.establecerUsuario(detected);
    }

    try {
      if (this.tieneSesionActiva()) {
        localStorage.removeItem(this.getClaveActual());
      } else {
        this.limpiarStorageInvitado();
      }
    } catch {
      // Ignora errores de almacenamiento si no está disponible
    }
    this.idsSubject.next([]);
  }
}