import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { TheNavbarComponent } from './components/the-navbar/the-navbar.component';
import { TheFooterComponent } from './components/the-footer/the-footer.component';
import { Router } from '@angular/router';
import { VoltexStateService } from './services/voltex-state';
import { NetworkSyncService } from './services/network-sync.service'; // <--- Importamos el servicio

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    TheNavbarComponent,
    TheFooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {

  esRutaAuth(): boolean {
    const rutaActual = this.router.url;
    return rutaActual.includes('/login') || rutaActual.includes('/registro');
  }
  
  // Variables para la PWA y detección de red
  isOnline: boolean = navigator.onLine;
  mensajeConexion: string = '';

  private networkSync = inject(NetworkSyncService); // <--- Inyectamos el servicio

  constructor(
    public state: VoltexStateService,
    public router: Router
  ) {}

  ngOnInit() {
    // Si ya inicia con internet, intentamos sincronizar de inmediato
    if (this.isOnline) {
      this.networkSync.sincronizarPedidosPendientes();
    }

    // Escuchar cuando el navegador recupera la conexión
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.mensajeConexion = 'Conexión restablecida. Sincronizando datos...';
      
      // Disparamos la sincronización con el backend
      this.networkSync.sincronizarPedidosPendientes();

      setTimeout(() => this.mensajeConexion = '', 4000);
    });

    // Escuchar cuando el navegador pierde la conexión
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.mensajeConexion = 'Sin conexión a internet. Operando en modo offline (PWA).';
    });
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}