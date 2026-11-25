import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LocalStorageService } from '../services/local-storage.service';
import { NetworkSyncService } from '../services/network-sync.service';

export const offlineSyncInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(LocalStorageService);
  const networkSync = inject(NetworkSyncService);

  // Si es una petición que ya viene del replay de sincronización, dejarla pasar directo
  if (req.headers.has('X-Offline-Replay')) {
    return next(req);
  }

  // 1. LECTURAS (GET): guardar caché al tener éxito; devolver caché si no hay internet
  if (req.method === 'GET') {
    if (!networkSync.enLinea()) {
      const cache = storage.obtenerCacheGet(req.urlWithParams);
      if (cache !== null) {
        return of(new HttpResponse({ status: 200, body: cache }));
      }
    }

    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.body !== null) {
          storage.guardarCacheGet(req.urlWithParams, event.body);
        }
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 0 || !navigator.onLine) {
          const cache = storage.obtenerCacheGet(req.urlWithParams);
          if (cache !== null) {
            return of(new HttpResponse({ status: 200, body: cache }));
          }
        }
        return throwError(() => err);
      })
    );
  }

  // 2. ESCRITURAS (POST, PUT, PATCH, DELETE): encolar si no hay internet
  const esEscritura = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const esLoginOArchivo =
    req.url.includes('/login') ||
    req.url.includes('/auth') ||
    req.body instanceof FormData;

  if (esEscritura && !esLoginOArchivo && !networkSync.enLinea()) {
    storage.encolarPeticionHttp(req.method, req.urlWithParams, req.body);
    networkSync.refrescarContadorPendientes();
    networkSync.estadoSync.set(
      'Sin internet: acción guardada localmente y se subirá al reconectar.'
    );

    return of(
      new HttpResponse({
        status: 202,
        body: {
          offlineQueued: true,
          message: 'Guardado sin conexión. Se sincronizará automáticamente.'
        }
      })
    );
  }

  return next(req);
};