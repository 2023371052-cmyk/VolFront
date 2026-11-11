import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-quick-pay',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quick-pay.html',
  styleUrl: './quick-pay.css'
})
export class QuickPayComponent implements OnInit {
  productoAComprar: any = null;

  constructor(
    public state: VoltexStateService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    // Buscamos el producto que el usuario seleccionó desde la notificación del reloj
    this.productoAComprar = this.state.productos().find((p: any) => p.id === id);
    
    if (!this.productoAComprar) {
      // Fallback por si entra directo
      this.productoAComprar = this.state.productos()[0];
    }
  }

  ejecutarCompraRapidas() {
    const nuevaOrden = {
      items: this.productoAComprar.nombre,
      total: this.productoAComprar.precio,
      status: 'EN PISTA'
    };

    // Opción A: Si tu servicio se comunica con el backend (NestJS/FastAPI)
    // Asegúrate de tener el método crearOrden o registrarCompra en tu VoltexStateService.
    if (typeof (this.state as any).crearOrden === 'function') {
      (this.state as any).crearOrden(nuevaOrden).subscribe({
        next: () => {
          this.router.navigate(['/order-success']);
        },
        error: (err: any) => {
          console.error('Error al registrar la orden:', err);
          alert('Hubo un problema al inyectar la orden en la base de datos.');
        }
      });
    } else {
      // Opción B: Redirección directa si manejas la lógica interna en el estado
      this.router.navigate(['/order-success']);
    }
  }
}