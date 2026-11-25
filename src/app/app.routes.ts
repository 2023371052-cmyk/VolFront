import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/auth.component'; //login
import { AdminComponent } from './pages/admin/admin.component'; //pagina de admin
import { StoreComponent } from './pages/store/store.component';
import { ProductoDetalleComponent } from './pages/product-detail/product-detail.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { Usuario } from './pages/usuario/usuario';
import { PerfilComponent } from './pages/perfil/perfil'; 
import { Deseos } from './pages/deseos/deseos'; // Importamos la lista de deseos
import { KartingComponent } from './pages/Roots (TVS)/karting';
import { Formula } from './pages/Centrifugo/formula';
import { DriftingComponent } from './pages/Twin-Screw/drifting'; // <-- Componente de drifting
import { OrderSuccessComponent } from './components/order-success/order-success'; // <-- NUEVO: Resumen de compra
import { PedidosComponent } from './pages/pedidos/pedidos'; // O el nombre exacto de la clase dentro de tu pedidos.ts
import { CompararComponent } from './services/comparar/comparar';
import { RegistroComponent } from './pages/auth/registro.component';
import { ConsumiblesComponent } from './pages/Consumibles/consumibles';
import { RefaccionesComponent } from './pages/Refacciones/refacciones';
import { QrManualScannerComponent } from './pages/qr-manual-scanner.component/qr-manual-scanner';
import { NotificacionesComponent } from './pages/notificaciones/notificaciones';


export const routes: Routes = [
  { path: '', redirectTo: 'tienda', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'tienda', component: StoreComponent },
  { path: 'producto/:id', component: ProductoDetalleComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'order-success', component: OrderSuccessComponent }, // <-- NUEVA RUTA
  { path: 'usuario', component: Usuario },
  { path: 'perfil', component: PerfilComponent },
  { path: 'deseos', component: Deseos },
  { path: 'karting', component: KartingComponent },
  { path: 'formula', component: Formula },
  { path: 'drifting', component: DriftingComponent },
  { path: 'refacciones', component: RefaccionesComponent },
  { path: 'consumibles', component: ConsumiblesComponent },
  { path: 'pedidos', component: PedidosComponent },
  { path: 'comparar', component: CompararComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'qr-scanner', component: QrManualScannerComponent }, // <-- NUEVA RUTA
  { path: 'qr-scanner/:productId', component: QrManualScannerComponent },
  { path: 'notificaciones', component: NotificacionesComponent }, // <-- NUEVA RUTA
  { path: '**', redirectTo: 'tienda' } // <-- SIEMPRE DEBE IR AL FINAL
];