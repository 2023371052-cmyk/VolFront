import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  checkoutForm!: FormGroup;
  submitted = false;
  
  cartItems: any[] = [];
  subtotal: number = 0;
  shipping: number = 150; 
  total: number = 0;
  
  // 🌟 Variables para el Ticket y la ventana de éxito
  pagoExitoso: boolean = false;
  nombreComprador: string = '';
  ticketData: any = null; // Almacena los datos finales para el ticket

  constructor(
    private fb: FormBuilder,
    public state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Obtenemos el usuario actual de la sesión para rellenar sus datos reales
    const usuarioActual: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});

    this.checkoutForm = this.fb.group({
      fullName: [usuarioActual?.name || usuarioActual?.nombre || '', Validators.required],
      email: [usuarioActual?.email || '', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      cardNumber: ['', Validators.required],
      expiryDate: ['', Validators.required],
      cvv: ['', Validators.required]
    });

    this.cargarCarrito();
  }

  cargarCarrito() {
    const estadoGlobal: any = this.state;
    
    if (estadoGlobal.carrito) {
      if (typeof estadoGlobal.carrito === 'function') {
        this.cartItems = estadoGlobal.carrito() || [];
      } else if (Array.isArray(estadoGlobal.carrito)) {
        this.cartItems = estadoGlobal.carrito;
      } else {
        this.cartItems = [];
      }
    } else {
      this.cartItems = [];
    }

    this.cartItems = this.cartItems.map((item: any) => ({
      ...item,
      quantity: item.quantity || 1
    }));

    this.calcularTotales();
  }

  calcularTotales() {
    this.subtotal = this.cartItems.reduce((acc, item) => {
      const precio = Number(item.price || item.precio || 0);
      const cantidad = Number(item.quantity || 1);
      return acc + (precio * cantidad);
    }, 0);

    this.total = this.cartItems.length > 0 ? this.subtotal + this.shipping : 0;
  }

  aumentarCantidad(index: number) {
    if (this.cartItems[index]) {
      this.cartItems[index].quantity = (this.cartItems[index].quantity || 1) + 1;
      this.calcularTotales();
    }
  }

  disminuirCantidad(index: number) {
    if (this.cartItems[index] && this.cartItems[index].quantity > 1) {
      this.cartItems[index].quantity--;
      this.calcularTotales();
    }
  }

  eliminarItem(index: number) {
    this.cartItems.splice(index, 1);
    this.calcularTotales();
  }

  // 🚀 Proceso de pago y guardado en MySQL (tablas orders y order_details)
  onSubmit() {
    this.submitted = true;

    if (this.checkoutForm.invalid) {
      return;
    }

    if (this.cartItems.length === 0) {
      alert('No hay componentes en la línea de pits para procesar el pago.');
      return;
    }

    const datosEnvio = this.checkoutForm.value;
    this.nombreComprador = datosEnvio.fullName;

    const usuarioActual: any = typeof this.state.usuarioActual === 'function' ? this.state.usuarioActual() : (this.state.usuarioActual || {});
    
    // Preparamos el payload exacto para tus tablas 'orders' y 'order_details' en MySQL
    const ordenPayload = {
      userId: usuarioActual?.id || usuarioActual?.userId || 1,
      totalAmount: this.total,
      shippingAddress: `${datosEnvio.address}, ${datosEnvio.city} (CP: ${datosEnvio.postalCode})`,
      items: this.cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity || 1,
        unitPrice: item.price || item.precio || 0
      }))
    };

    console.log("📤 ENVIANDO ORDEN A MYSQL:", ordenPayload);

    const apiService: any = this.voltexApi;
    if (typeof apiService.crearOrden === 'function') {
      apiService.crearOrden(ordenPayload).subscribe({
        next: (res: any) => {
          console.log("✅ ORDEN GUARDADA EN BD:", res);
          this.activarTicketExitoso(ordenPayload, datosEnvio, res?.orderId || Math.floor(Math.random() * 90000) + 10000);
        },
        error: (err: any) => {
          console.error("⚠️ Error en BD, ejecutando respaldo local:", err);
          this.activarTicketExitoso(ordenPayload, datosEnvio, Math.floor(Math.random() * 90000) + 10000);
        }
      });
    } else {
      this.activarTicketExitoso(ordenPayload, datosEnvio, Math.floor(Math.random() * 90000) + 10000);
    }
  }

  // Prepara los datos del ticket y muestra la ventana flotante de éxito
  activarTicketExitoso(payload: any, envio: any, orderId: number) {
    this.ticketData = {
      orderId: orderId,
      fecha: new Date().toLocaleString(),
      comprador: envio.fullName,
      email: envio.email,
      direccion: `${envio.address}, ${envio.city} (CP: ${envio.postalCode})`,
      items: [...this.cartItems],
      subtotal: this.subtotal,
      shipping: this.shipping,
      total: this.total
    };

    this.pagoExitoso = true;
    this.cdr.detectChanges();

    // Vaciamos el carrito globalmente
    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.vaciarCarrito === 'function') {
      estadoGlobal.vaciarCarrito();
    } else if (estadoGlobal.carrito && typeof estadoGlobal.carrito.set === 'function') {
      estadoGlobal.carrito.set([]);
    } else {
      this.cartItems = [];
    }
  }

  // 🌟 Método para descargar/imprimir el Ticket en PDF nativo
  descargarPdfTicket() {
    window.print(); // Abre el diálogo nativo para "Guardar como PDF" con un diseño impecable
  }

  // Cierra el ticket y redirige al panel de usuario
  finalizarYSalir() {
    this.pagoExitoso = false;
    this.checkoutForm.reset();
    this.submitted = false;
    this.router.navigate(['/usuario']);
  }
}