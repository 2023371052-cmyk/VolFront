import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/auth.component'; //login
import { AdminComponent } from './pages/admin/admin.component'; //pagina de admin
import { StoreComponent } from './pages/store/store.component';
import { ProductoDetalleComponent } from './pages/product-detail/product-detail.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { Usuario } from './pages/usuario/usuario';
import { PerfilComponent } from './pages/perfil/perfil'; 
import { Deseos } from './pages/deseos/deseos'; // Importamos la lista de deseos
import { KartingComponent } from './pages/karting/karting';
import { Rally } from './pages/rally/rally';
import { Formula } from './pages/formula/formula';
import { DriftingComponent } from './pages/drifting/drifting'; // <-- Componente de drifting
import { OrderSuccessComponent } from './components/order-success/order-success'; // <-- NUEVO: Resumen de compra
import { QuickPayComponent } from './components/quick-pay/quick-pay'; // <-- NUEVO: Pago rápido desde el smartwatch
import { PedidosComponent } from './pages/pedidos/pedidos'; // O el nombre exacto de la clase dentro de tu pedidos.ts
import { CompararComponent } from './services/comparar/comparar';
import { RegistroComponent } from './pages/auth/registro.component';


export const routes: Routes = [
  { path: '', redirectTo: 'tienda', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'tienda', component: StoreComponent },
  { path: 'producto/:id', component: ProductoDetalleComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'order-success', component: OrderSuccessComponent }, // <-- NUEVA RUTA
  { path: 'quick-pay/:id', component: QuickPayComponent }, // <-- NUEVA RUTA EXPRESS
  { path: 'usuario', component: Usuario },
  { path: 'perfil', component: PerfilComponent },
  { path: 'deseos', component: Deseos },
  { path: 'karting', component: KartingComponent },
  { path: 'rally', component: Rally },
  { path: 'formula', component: Formula },
  { path: 'drifting', component: DriftingComponent },
  { path: 'pedidos', component: PedidosComponent },
  { path: 'comparar', component: CompararComponent },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: 'tienda' } // <-- SIEMPRE DEBE IR AL FINAL
];