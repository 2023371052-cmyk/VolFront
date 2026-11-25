import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
import { ComparadorService } from '../../services/comparar/comparar.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './usuario.html',
  styleUrl: './usuario.css'
})
export class Usuario implements OnInit, OnDestroy {
  private readonly MAX_COMPARAR = 3;
  private usuarioIdActual: string | number = 'invitado';
  private subs = new Subscription();
  private idsNotificacionesVistas = new Set<string | number>();
  private primeraCargaNotificaciones = true;

  isScrolled: boolean = false;
  usuarioEmail: string | null = null;

  products: any[] = [];
  pedidos: any[] = [];
  listaDeseos: any[] = [];
  cargando = true;

  // 🔍 Estado para comparar componentes (sincronizado con ComparadorService)
  compareIds: Array<number | string> = [];

  // 🔔 Estado para notificaciones en tiempo real
  notificaciones: any[] = [];
  notificacionesNoLeidas: number = 0;

  // 🌟 Variables para la notificación flotante bonita
  mensajeToast: string = '';
  mostrarToast: boolean = false;

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    @Inject(ComparadorService) private comparadorService: ComparadorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user: any =
      typeof this.state.usuarioActual === 'function'
        ? this.state.usuarioActual()
        : (this.state.usuarioActual || {});

    if (user && user.email) {
      this.usuarioEmail = user.email;
      this.usuarioIdActual =
        user.id ?? user.userId ?? user.usuarioId ?? user.sub ?? user.email ?? 'invitado';

      this.sincronizarComparador();
      this.cargarDatosReales(user.email);
      this.iniciarEscuchaNotificacionesTiempoReal(user);
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ==========================================================================
  // COMPARADOR DE COMPONENTES (CONECTADO A ComparadorService)
  // ==========================================================================
  private sincronizarComparador(): void {
    const idsSincronizados = this.comparadorService.obtenerIdsSincronizados(this.usuarioIdActual);
    this.compareIds = Array.isArray(idsSincronizados) ? idsSincronizados : [];

    const subComparador = this.comparadorService.ids$.subscribe((ids: number[]) => {
      this.compareIds = Array.isArray(ids) ? [...ids] : [];
      this.cdr.detectChanges();
    });

    this.subs.add(subComparador);
  }

  cargarComparacionLocal(): void {
    const ids = this.comparadorService.obtenerIdsSincronizados(this.usuarioIdActual);
    this.compareIds = Array.isArray(ids) ? [...ids] : [];
  }

  private obtenerIdNumerico(producto: any): number | null {
    const rawId =
      producto?.id ??
      producto?._id ??
      producto?.id_producto ??
      producto?.productoId ??
      null;

    if (rawId === null || rawId === undefined || String(rawId).trim() === '') {
      return null;
    }

    const num = Number(rawId);
    return isNaN(num) ? null : num;
  }

  estaEnComparacion(id: number | string): boolean {
    return this.compareIds.some((itemId) => String(itemId) === String(id));
  }

  toggleComparar(producto: any): void {
    const idNum = this.obtenerIdNumerico(producto);
    if (idNum === null) return;

    this.comparadorService.obtenerIdsSincronizados(this.usuarioIdActual);
    const nombre = producto.name || producto.nombre || 'Componente';
    const existe = this.estaEnComparacion(idNum);

    if (existe) {
      this.comparadorService.removerId(idNum);
      this.dispararNotificacion(`⚖️ "${nombre}" quitado de la comparativa.`);
      return;
    }

    const actuales = this.comparadorService.getIdsActuales();
    if (actuales.length >= this.MAX_COMPARAR) {
      this.dispararNotificacion(
        `⚠️ Máximo ${this.MAX_COMPARAR} componentes en comparativa. Quita uno para agregar otro.`
      );
      return;
    }

    const agregado = this.comparadorService.agregarId(idNum);
    if (agregado) {
      const totalActual = this.comparadorService.getIdsActuales().length;
      this.dispararNotificacion(
        `⚖️ "${nombre}" listo para comparar (${totalActual}/${this.MAX_COMPARAR}).`
      );
    }
  }

  // ==========================================================================
  // NOTIFICACIONES EN TIEMPO REAL
  // ==========================================================================
  private iniciarEscuchaNotificacionesTiempoReal(user: any): void {
    const apiService: any = this.voltexApi;

    // 1. Si tu servicio expone un observable o socket de notificaciones en tiempo real
    const streamNotificaciones$ =
      apiService.notificacionesTiempoReal$ ??
      apiService.onNotificacion?.() ??
      null;

    if (streamNotificaciones$ && typeof streamNotificaciones$.subscribe === 'function') {
      const subSocket = streamNotificaciones$.subscribe({
        next: (payload: any) => this.procesarNotificacionEntrante(payload),
        error: (err: any) => console.warn('Error en stream de notificaciones en tiempo real:', err)
      });
      this.subs.add(subSocket);
    }

    // 2. Si tu servicio tiene método para consultar notificaciones, sincroniza al entrar y cada 15s
    const obtenerNotificacionesFn =
      typeof apiService.getNotificaciones === 'function'
        ? () => apiService.getNotificaciones(this.usuarioIdActual, user.email)
        : typeof apiService.obtenerNotificaciones === 'function'
          ? () => apiService.obtenerNotificaciones(this.usuarioIdActual)
          : null;

    if (obtenerNotificacionesFn) {
      const consultar = () => {
        obtenerNotificacionesFn().subscribe({
          next: (resp: any) => {
            const lista = Array.isArray(resp)
              ? resp
              : (resp?.notificaciones || resp?.notifications || resp?.data || []);
            this.sincronizarListaNotificaciones(lista);
          },
          error: () => {
            // Silencioso en caso de que el endpoint aún no exista o esté offline
          }
        });
      };

      consultar();
      const subPolling = interval(15000).subscribe(() => consultar());
      this.subs.add(subPolling);
    }
  }

  private sincronizarListaNotificaciones(lista: any[]): void {
    if (!Array.isArray(lista)) return;

    this.notificaciones = lista;
    this.notificacionesNoLeidas = lista.filter((n: any) => !n?.leida && !n?.read).length;

    if (this.primeraCargaNotificaciones) {
      lista.forEach((n: any, idx: number) => {
        this.idsNotificacionesVistas.add(n?.id ?? n?._id ?? `idx-${idx}`);
      });
      this.primeraCargaNotificaciones = false;
      this.cdr.detectChanges();
      return;
    }

    // Detecta notificaciones recién llegadas para mostrar toast en vivo
    lista.forEach((n: any, idx: number) => {
      const clave = n?.id ?? n?._id ?? n?.mensaje ?? n?.message ?? `idx-${idx}`;
      if (!this.idsNotificacionesVistas.has(clave)) {
        this.idsNotificacionesVistas.add(clave);
        const texto = n?.mensaje || n?.message || n?.titulo || n?.title || 'Nueva alerta en pits';
        this.dispararNotificacion(`🔔 ${texto}`);
      }
    });

    this.cdr.detectChanges();
  }

  private procesarNotificacionEntrante(payload: any): void {
    if (!payload) return;

    const notificacion = payload?.notificacion || payload?.data || payload;
    this.notificaciones = [notificacion, ...this.notificaciones];

    if (!notificacion?.leida && !notificacion?.read) {
      this.notificacionesNoLeidas += 1;
    }

    const texto =
      notificacion?.mensaje ||
      notificacion?.message ||
      notificacion?.titulo ||
      notificacion?.title ||
      'Nueva notificación en tiempo real';

    this.dispararNotificacion(`🔔 ${texto}`);
    this.cdr.detectChanges();
  }

  // ==========================================================================
  // DATOS DEL PANEL, PEDIDOS Y CARRITO
  // ==========================================================================
  cargarDatosReales(email: string) {
    this.cargando = true;

    // 1. Cargamos los productos
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        console.log('📦 PRODUCTOS RECIBIDOS DE LA BD:', data);

        if (Array.isArray(data)) {
          this.products = data;
        } else if (data && Array.isArray(data.products)) {
          this.products = data.products;
        } else if (data && Array.isArray(data.productos)) {
          this.products = data.productos;
        } else if (data && Array.isArray(data.data)) {
          this.products = data.data;
        } else {
          this.products = [];
        }

        // Guardamos los productos cargados para que la vista /manuales-qr los reconozca al escanear
        try {
          localStorage.setItem('voltex_products', JSON.stringify(this.products));
        } catch (storageErr) {
          console.warn('No se pudieron guardar los productos en localStorage:', storageErr);
        }

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar productos de la BD:', err);
        this.products = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });

    // 2. Cargamos las órdenes del usuario
    this.voltexApi.getOrdenesPorUsuario(email).subscribe({
      next: (data: any) => {
        this.pedidos = Array.isArray(data) ? data : (data.ordenes || data.data || []);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar el historial de pedidos:', err);
        this.pedidos = [];
      }
    });
  }

  // 🌟 Método para disparar la notificación flotante bonita
  dispararNotificacion(texto: string) {
    this.mensajeToast = texto;
    this.mostrarToast = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarToast = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  private persistirEnCarritoLocal(productoAdaptado: any): void {
    const key = `voltex_cart_${this.usuarioIdActual}`;
    try {
      const raw = localStorage.getItem(key);
      const carritoActual = raw ? JSON.parse(raw) : [];
      const lista = Array.isArray(carritoActual) ? [...carritoActual] : [];

      const idx = lista.findIndex((item: any) => String(item?.id) === String(productoAdaptado.id));
      if (idx >= 0) {
        lista[idx] = {
          ...lista[idx],
          quantity: (Number(lista[idx].quantity) || 1) + 1
        };
      } else {
        lista.push(productoAdaptado);
      }

      localStorage.setItem(key, JSON.stringify(lista));
    } catch (err) {
      console.warn('No se pudo persistir el carrito localmente:', err);
    }
  }

  agregarAlCarrito(producto: any) {
    const supercargadorAdaptado: any = {
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: producto.price || producto.precio,
      imageUrl: producto.imageUrl || producto.image || producto.imagen,
      category: producto.category || producto.categoria,
      marca: producto.marca || 'Voltex Pro',
      modalidad: producto.modalidad || 'Inducción',
      quantity: 1
    };

    // Añadimos al estado global de forma segura
    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    // Persistimos por usuario en localStorage para mantenerlo hasta compra o eliminación
    this.persistirEnCarritoLocal(supercargadorAdaptado);

    // 🌟 Mostramos la notificación bonita y redirigimos al checkout después de un instante
    this.dispararNotificacion(`🛒 ¡${supercargadorAdaptado.name} añadido a la orden técnica!`);
    setTimeout(() => {
      this.router.navigate(['/checkout']);
    }, 900);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Si el scroll baja más de 80 píxeles, contrae el header superior
    this.isScrolled = window.scrollY > 80;
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}