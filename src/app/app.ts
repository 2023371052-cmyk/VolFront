import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { TheNavbarComponent } from './components/the-navbar/the-navbar.component';
import { TheFooterComponent } from './components/the-footer/the-footer.component';
import { VoltexStateService } from './services/voltex-state';
import { NetworkSyncService } from './services/network-sync.service';
import { ActualizacionPwaService } from './services/actualizacion-pwa.service';

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
public networkSync = inject(NetworkSyncService);
private actualizacionPwa = inject(ActualizacionPwaService);

  constructor(
    public state: VoltexStateService,
    public router: Router
  ) {}

  esRutaAuth(): boolean {
    const rutaActual = this.router.url;
    return rutaActual.includes('/login') || rutaActual.includes('/registro');
  }

  ngOnInit() {
    if (this.networkSync.enLinea()) {
      void this.networkSync.sincronizarPedidosPendientes();
    }
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}