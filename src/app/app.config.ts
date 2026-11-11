import { ApplicationConfig, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Usamos el nombre oficial y estable para Angular 21+
    provideZonelessChangeDetection(), 
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        options: {
          darkModeSelector: '.my-app-dark'
        }
      }
    }),
    // Registro del Service Worker para la PWA
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};