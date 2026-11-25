import { Injectable, ApplicationRef, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval, concat } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActualizacionPwaService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);

  readonly actualizando = signal<boolean>(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    // 1. Revisar al estabilizar la app y luego cada 2 minutos
    const estable$ = this.appRef.isStable.pipe(first((ok) => ok === true));
    const cadaDosMinutos$ = interval(2 * 60 * 1000);

    concat(estable$, cadaDosMinutos$).subscribe(() => {
      void this.revisarActualizacion();
    });

    // 2. Revisar cada vez que el usuario vuelve a la pestaña/app
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void this.revisarActualizacion();
        }
      });
    }

    // 3. Cuando haya una versión nueva lista, activarla y recargar
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.actualizando.set(true);
        void this.swUpdate.activateUpdate().then(() => {
          document.location.reload();
        });
      });
  }

  async revisarActualizacion(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    try {
      await this.swUpdate.checkForUpdate();
    } catch (err) {
      console.warn('No se pudo comprobar actualización del Service Worker:', err);
    }
  }
}