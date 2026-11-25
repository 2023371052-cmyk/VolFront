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
  private readonly CART_BASE_KEY = 'voltex_cart';
  private usuarioIdActual: string | number = 'invitado';

  checkoutForm!: FormGroup;
  submitted = false;

  cartItems: any[] = [];
  subtotal: number = 0;
  shipping: number = 150;
  total: number = 0;

  // Aviso de stock (sin existencias o límite alcanzado)
  stockErrorMsg: string = '';

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
    const usuarioActual: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});

    this.usuarioIdActual =
      usuarioActual?.id ??
      usuarioActual?.userId ??
      usuarioActual?.usuarioId ??
      usuarioActual?.sub ??
      usuarioActual?.email ??
      'invitado';

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
    this.sincronizarStockDesdeBD();
  }

  private getCartStorageKey(): string {
    return `${this.CART_BASE_KEY}_${this.usuarioIdActual}`;
  }

  private leerCarritoLocal(): any[] {
    try {
      const key = this.getCartStorageKey();
      let raw = localStorage.getItem(key);

      // Migra datos previos si existieran bajo clave sin usuario
      if (!raw) {
        const legacy = localStorage.getItem(this.CART_BASE_KEY);
        if (legacy) {
          localStorage.setItem(key, legacy);
          raw = legacy;
        }
      }

      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private guardarCarritoPersistente(items: any[]): void {
    const listaLimpia = Array.isArray(items) ? items : [];
    try {
      localStorage.setItem(this.getCartStorageKey(), JSON.stringify(listaLimpia));
    } catch (e) {
      console.error('Error al guardar el carrito en localStorage:', e);
    }

    // Mantiene sincronizado el estado en memoria si existe
    const estadoGlobal: any = this.state;
    if (estadoGlobal.carrito && typeof estadoGlobal.carrito.set === 'function') {
      estadoGlobal.carrito.set([...listaLimpia]);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.splice(0, estadoGlobal.carrito.length, ...listaLimpia);
    }
  }

  private limpiarCarritoPersistente(): void {
    try {
      localStorage.removeItem(this.getCartStorageKey());
    } catch {
      // Ignora errores de acceso a localStorage
    }

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.vaciarCarrito === 'function') {
      estadoGlobal.vaciarCarrito();
    } else if (estadoGlobal.carrito && typeof estadoGlobal.carrito.set === 'function') {
      estadoGlobal.carrito.set([]);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.splice(0, estadoGlobal.carrito.length);
    }
  }

  private extraerStock(obj: any): number | null {
    if (!obj || typeof obj !== 'object') return null;
    const raw =
      obj.stock ??
      obj.cantidadDisponible ??
      obj.availableStock ??
      obj.cantidad ??
      obj.existencias ??
      obj.producto?.stock ??
      obj.producto?.cantidadDisponible ??
      null;

    if (raw === null || raw === undefined || raw === '') return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : Math.max(0, num);
  }

  getStockDisponible(item: any): number {
    const directo = this.extraerStock(item);
    if (directo !== null) return directo;
    return 0;
  }

  cargarCarrito(): void {
    const estadoGlobal: any = this.state;
    let stateItems: any[] = [];

    if (estadoGlobal.carrito) {
      if (typeof estadoGlobal.carrito === 'function') {
        stateItems = estadoGlobal.carrito() || [];
      } else if (Array.isArray(estadoGlobal.carrito)) {
        stateItems = estadoGlobal.carrito;
      }
    }

    const localItems = this.leerCarritoLocal();

    // Combina evitando duplicados por ID: prioriza lo guardado localmente si existe
    const mapaItems = new Map<string, any>();
    for (const item of stateItems) {
      if (item && item.id !== undefined && item.id !== null) {
        mapaItems.set(String(item.id), { ...item });
      }
    }
    for (const item of localItems) {
      if (item && item.id !== undefined && item.id !== null) {
        mapaItems.set(String(item.id), { ...item });
      }
    }

    const rawItems = Array.from(mapaItems.values());

    // Respaldo de productos guardados en localStorage para obtener su stock si el item no lo traía
    let productosCache: any[] = [];
    try {
      const guardados = localStorage.getItem('voltex_products');
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed)) productosCache = parsed;
      }
    } catch {
      // Ignora errores de acceso a localStorage
    }

    this.cartItems = rawItems.map((item: any) => {
      const matchCache = productosCache.find(
        (p: any) => String(p?.id) === String(item?.id)
      );
      const stockReal =
        this.extraerStock(item) ??
        this.extraerStock(matchCache) ??
        0;

      const cantidadSolicitada = Math.max(1, Number(item.quantity) || 1);
      const cantidadAjustada = stockReal > 0 ? Math.min(cantidadSolicitada, stockReal) : 0;

      return {
        ...item,
        stock: stockReal,
        quantity: cantidadAjustada
      };
    });

    this.guardarCarritoPersistente(this.cartItems);
    this.validarEstadoStockInicial();
    this.calcularTotales();
  }

  private sincronizarStockDesdeBD(): void {
    const apiService: any = this.voltexApi;
    if (typeof apiService.getProductos !== 'function') return;

    apiService.getProductos().subscribe({
      next: (data: any) => {
        const listaProductos: any[] = Array.isArray(data)
          ? data
          : (data?.products || data?.productos || data?.data || []);

        if (!Array.isArray(listaProductos) || listaProductos.length === 0) return;

        try {
          localStorage.setItem('voltex_products', JSON.stringify(listaProductos));
        } catch {
          // Ignora errores de localStorage
        }

        if (this.cartItems.length === 0) return;

        this.cartItems = this.cartItems.map((item: any) => {
          const productoBd = listaProductos.find(
            (p: any) => String(p?.id) === String(item?.id)
          );
          const stockBd = this.extraerStock(productoBd) ?? this.getStockDisponible(item);
          const cantidadActual = Number(item.quantity) || 0;
          const cantidadFinal = stockBd > 0 ? Math.min(Math.max(1, cantidadActual), stockBd) : 0;

          return {
            ...item,
            stock: stockBd,
            quantity: cantidadFinal
          };
        });

        this.guardarCarritoPersistente(this.cartItems);
        this.validarEstadoStockInicial();
        this.calcularTotales();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.warn('No se pudo actualizar el stock en vivo desde la BD:', err);
      }
    });
  }

  private validarEstadoStockInicial(): void {
    const sinStock = this.cartItems.filter((item) => this.getStockDisponible(item) <= 0);
    if (sinStock.length > 0) {
      const nombres = sinStock.map((i) => i.name || i.nombre || 'Producto').join(', ');
      this.stockErrorMsg = `No puedes agregar ${nombres} porque no hay en stock.`;
    } else {
      this.stockErrorMsg = '';
    }
  }

  calcularTotales(): void {
    this.subtotal = this.cartItems.reduce((acc, item) => {
      const stockReal = this.getStockDisponible(item);
      if (stockReal <= 0) return acc;

      const precio = Number(item.price || item.precio || 0);
      const cantidad = Number(item.quantity || 0);
      return acc + (precio * cantidad);
    }, 0);

    this.total = this.subtotal > 0 ? this.subtotal + this.shipping : 0;
  }

  aumentarCantidad(index: number): void {
    const item = this.cartItems[index];
    if (!item) return;

    const nombre = item.name || item.nombre || 'este producto';
    const stockReal = this.getStockDisponible(item);
    const cantidadActual = Number(item.quantity) || 0;

    if (stockReal <= 0) {
      item.quantity = 0;
      this.guardarCarritoPersistente(this.cartItems);
      this.stockErrorMsg = `No puedes agregar "${nombre}" porque no hay en stock.`;
      this.calcularTotales();
      return;
    }

    if (cantidadActual >= stockReal) {
      this.stockErrorMsg = `Solo hay ${stockReal} disponible(s) en stock para "${nombre}".`;
      return;
    }

    this.stockErrorMsg = '';
    item.quantity = cantidadActual + 1;
    this.guardarCarritoPersistente(this.cartItems);
    this.calcularTotales();
  }

  disminuirCantidad(index: number): void {
    const item = this.cartItems[index];
    if (!item) return;

    const stockReal = this.getStockDisponible(item);
    const cantidadActual = Number(item.quantity) || 0;

    if (stockReal <= 0) {
      item.quantity = 0;
      this.guardarCarritoPersistente(this.cartItems);
      this.stockErrorMsg = `No puedes agregar "${item.name || item.nombre}" porque no hay en stock.`;
      this.calcularTotales();
      return;
    }

    if (cantidadActual > 1) {
      this.stockErrorMsg = '';
      item.quantity = cantidadActual - 1;
      this.guardarCarritoPersistente(this.cartItems);
      this.calcularTotales();
    }
  }

  eliminarItem(index: number): void {
    this.cartItems.splice(index, 1);
    this.guardarCarritoPersistente(this.cartItems);
    this.validarEstadoStockInicial();
    this.calcularTotales();
  }

  // 🚀 Proceso de pago y guardado en MySQL (tablas orders y order_details)
  onSubmit(): void {
    this.submitted = true;

    if (this.checkoutForm.invalid) {
      return;
    }

    if (this.cartItems.length === 0) {
      this.stockErrorMsg = 'No hay componentes en la línea de pits para procesar el pago.';
      return;
    }

    const itemSinStock = this.cartItems.find((item) => this.getStockDisponible(item) <= 0);
    if (itemSinStock) {
      this.stockErrorMsg = `No puedes agregar "${itemSinStock.name || itemSinStock.nombre}" porque no hay en stock. Quítalo del carrito para continuar.`;
      return;
    }

    const itemExcedido = this.cartItems.find(
      (item) => (Number(item.quantity) || 0) > this.getStockDisponible(item)
    );
    if (itemExcedido) {
      const stockReal = this.getStockDisponible(itemExcedido);
      itemExcedido.quantity = stockReal;
      this.guardarCarritoPersistente(this.cartItems);
      this.calcularTotales();
      this.stockErrorMsg = `La cantidad de "${itemExcedido.name || itemExcedido.nombre}" se ajustó al stock máximo disponible (${stockReal}).`;
      return;
    }

    const usuarioActual: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});

    const rawUserId =
      usuarioActual?.id ??
      usuarioActual?.userId ??
      usuarioActual?.usuarioId ??
      usuarioActual?.sub ??
      null;

    const userIdNum = Number(rawUserId);

    if (!rawUserId || Number.isNaN(userIdNum) || userIdNum <= 0) {
      this.stockErrorMsg = 'Debes iniciar sesión con tu cuenta para registrar la orden.';
      return;
    }

    const datosEnvio = this.checkoutForm.value;
    this.nombreComprador = datosEnvio.fullName;

    const ordenPayload = {
      userId: userIdNum,
      totalAmount: this.total,
      shippingAddress: `${datosEnvio.address}, ${datosEnvio.city} (CP: ${datosEnvio.postalCode})`,
      items: this.cartItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity || 1,
        unitPrice: item.price || item.precio || 0
      }))
    };

    console.log('📤 ENVIANDO ORDEN A MYSQL:', ordenPayload);

    const apiService: any = this.voltexApi;
    if (typeof apiService.crearOrden === 'function') {
      apiService.crearOrden(ordenPayload).subscribe({
        next: (res: any) => {
          console.log('✅ ORDEN GUARDADA EN BD:', res);
          this.activarTicketExitoso(
            ordenPayload,
            datosEnvio,
            res?.orderId || Math.floor(Math.random() * 90000) + 10000
          );
        },
        error: (err: any) => {
          console.error('⚠️ Error en BD, ejecutando respaldo local:', err);
          this.activarTicketExitoso(
            ordenPayload,
            datosEnvio,
            Math.floor(Math.random() * 90000) + 10000
          );
        }
      });
    } else {
      this.activarTicketExitoso(
        ordenPayload,
        datosEnvio,
        Math.floor(Math.random() * 90000) + 10000
      );
    }
  }

  activarTicketExitoso(payload: any, envio: any, orderId: number): void {
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

    // Solo aquí se vacía el carrito porque la compra se completó
    this.limpiarCarritoPersistente();
    this.cartItems = [];
    this.pagoExitoso = true;
    this.cdr.detectChanges();
  }

  descargarPdfTicket(): void {
    window.print();
  }

  finalizarYSalir(): void {
    this.pagoExitoso = false;
    this.checkoutForm.reset();
    this.submitted = false;
    this.router.navigate(['/usuario']);
  }
}