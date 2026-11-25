import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
// import { LocalNotifications } from '@capacitor/local-notifications'; // Descomenta si usas Capacitor

export type ApartadoAdmin = 'inventario' | 'nuevo-kit' | 'notificaciones' | 'manuales';

interface AlertaProgramada {
  id: string;
  titulo: string;
  mensaje: string;
  horaTexto: string;
  timestampObjetivo: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly STORAGE_PROGRAMADAS_KEY = 'voltex_notificaciones_programadas';
  private timersActivos = new Map<string, ReturnType<typeof setTimeout>>();

  // Pestaña activa del panel
  apartadoActivo: ApartadoAdmin = 'inventario';
  mensajeNotif: string = '';

  // Buscador de inventario
  terminoBusqueda: string = '';

  // Variables del formulario de creación
  nuevoNombre: string = '';
  nuevoSku: string = '';
  nuevaMarca: string = '';
  nuevaCategoria: string = '';
  nuevoTipo: string = 'Centrifugo';
  nuevoNivelKit: string = 'Complete Kit';
  nuevaPlataforma: string = '';
  nuevoRangoAnio: string = '';
  nuevaPotencia: string = '';
  nuevoBoost: string = '';
  nuevoEnfriamiento: string = 'Aire-Aire';
  nuevoPrecio: number | null = null;
  nuevoStock: number | null = 10;
  nuevaDisponibilidad: string = 'En Stock MX';
  nuevoTiempoEntrega: string = '';
  nuevaImagen: string = '';
  nuevoDescripcion: string = '';
  nuevoIncluyeCaja: string = '';
  nuevasNotas: string = '';

  // Variables para el Modal de Edición de Kit
  editando: boolean = false;
  kitEditandoId: number | null = null;
  editNombre: string = '';
  editMarca: string = '';
  editCategoria: string = '';
  editPrecio: number | null = null;
  editStock: number | null = null;
  editImagen: string = '';
  editDescripcion: string = '';

  // Variables para la confirmación de eliminación de Kit
  mostrandoConfirmacion: boolean = false;
  kitAEliminarId: number | null = null;

  // Variables de notificación push
  notifTitulo: string = '';
  notifMensaje: string = '';
  notifHora: string = '';

  // Variables para editar notificación en Admin
  editandoNotifId: number | string | null = null;
  editNotifTitulo: string = '';
  editNotifMensaje: string = '';
  editNotifHora: string = '';

  // Variables del apartado de Manuales por ID de Producto (QR)
  manuales: any[] = [];
  qrImagenes = new Map<number, string>();
  manualProductoId: number | null = null;
  manualTitulo: string = '';
  manualUrl: string = '';
  manualArchivoNombre: string = '';
  manualArchivoFile: File | null = null;
  manualNotas: string = '';
  mensajeManual: string = '';

  constructor(
    public state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarInventarioReal();
    this.cargarNotificacionesReales();
    this.cargarManuales();
    this.restaurarAlertasProgramadas();
  }

  ngOnDestroy() {
    this.timersActivos.forEach((timer) => clearTimeout(timer));
    this.timersActivos.clear();
  }

  cambiarApartado(apartado: ApartadoAdmin) {
    this.apartadoActivo = apartado;
    if (apartado === 'notificaciones') {
      this.cargarNotificacionesReales();
    } else if (apartado === 'manuales') {
      this.cargarManuales();
    }
  }

  limpiarBusqueda() {
    this.terminoBusqueda = '';
  }

  productosFiltrados() {
    const lista = this.state.productos() || [];
    const q = this.terminoBusqueda.trim().toLowerCase();

    if (!q) {
      return lista;
    }

    return lista.filter((prod: any) => {
      const campos = [
        prod?.name,
        prod?.sku,
        prod?.marca,
        prod?.category,
        prod?.plataforma_motor,
        prod?.tipo_supercargador,
        prod?.description
      ];

      return campos.some((valor) =>
        String(valor ?? '').toLowerCase().includes(q)
      );
    });
  }

  cargarInventarioReal() {
    this.voltexApi.getProductos().subscribe({
      next: (productosBD) => {
        this.state.productos.set(productosBD);
      },
      error: (err) => {
        console.error('Error al cargar inventario de MySQL:', err);
      }
    });
  }

  private limpiarFormularioProducto() {
    this.nuevoNombre = '';
    this.nuevoSku = '';
    this.nuevaMarca = '';
    this.nuevaCategoria = '';
    this.nuevoTipo = 'Centrifugo';
    this.nuevoNivelKit = 'Complete Kit';
    this.nuevaPlataforma = '';
    this.nuevoRangoAnio = '';
    this.nuevaPotencia = '';
    this.nuevoBoost = '';
    this.nuevoEnfriamiento = 'Aire-Aire';
    this.nuevoPrecio = null;
    this.nuevoStock = 10;
    this.nuevaDisponibilidad = 'En Stock MX';
    this.nuevoTiempoEntrega = '';
    this.nuevaImagen = '';
    this.nuevoDescripcion = '';
    this.nuevoIncluyeCaja = '';
    this.nuevasNotas = '';
  }

  crearProducto() {
    if (
      !this.nuevoNombre ||
      !this.nuevoSku ||
      !this.nuevaMarca ||
      !this.nuevaCategoria ||
      this.nuevoPrecio === null ||
      this.nuevoStock === null
    ) {
      alert('Por favor completa los campos obligatorios (*).');
      return;
    }

    const nuevoKit = {
      name: this.nuevoNombre,
      sku: this.nuevoSku,
      marca: this.nuevaMarca,
      category: this.nuevaCategoria,
      tipo_supercargador: this.nuevoTipo,
      nivel_kit: this.nuevoNivelKit,
      plataforma_motor: this.nuevaPlataforma || 'N/A',
      rango_anio: this.nuevoRangoAnio || 'N/A',
      potencia_max: this.nuevaPotencia || 'N/A',
      boost_base: this.nuevoBoost || 'N/A',
      presionBoost: this.nuevoBoost || 'N/A',
      enfriamiento: this.nuevoEnfriamiento,
      price: Number(this.nuevoPrecio),
      stock: Number(this.nuevoStock),
      disponibilidad: this.nuevaDisponibilidad,
      tiempo_entrega: this.nuevoTiempoEntrega || 'Por confirmar',
      imageUrl: this.nuevaImagen || 'assets/img/supercargador-default.jpg',
      description: this.nuevoDescripcion || 'Kit de inducción forzada de alta competición',
      incluye_caja: this.nuevoIncluyeCaja,
      notas_instalacion: this.nuevasNotas
    };

    this.voltexApi.crearProducto(nuevoKit).subscribe({
      next: async () => {
        this.cargarInventarioReal();
        this.state.lanzarNotificacion(
          '¡NUEVO KIT DISPONIBLE!',
          `Se ha inyectado el modelo ${nuevoKit.name} al stock.`,
          'push'
        );

        try {
          // @ts-ignore
          if (typeof LocalNotifications !== 'undefined') {
            // @ts-ignore
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: '7VOLTEX Pits',
                  body: `¡Nuevo kit: ${nuevoKit.name} en stock!`,
                  id: new Date().getTime()
                }
              ]
            });
          }
        } catch (e) {
          console.log('Notificación nativa no disponible en web', e);
        }

        this.limpiarFormularioProducto();
        this.apartadoActivo = 'inventario';
      },
      error: (err) => console.error('Error al guardar:', err)
    });
  }

  alternarEstadoKit(prod: any) {
    const nuevoStockVal = prod.stock > 0 ? 0 : 10;
    const kitActualizado = {
      name: prod.name,
      price: prod.price,
      stock: nuevoStockVal,
      description: prod.description
    };

    this.voltexApi.actualizarProducto(prod.id, kitActualizado).subscribe({
      next: () => {
        this.cargarInventarioReal();
        const estadoTxt = nuevoStockVal > 0 ? 'habilitado con 10 pzas' : 'deshabilitado (sin stock)';
        this.state.lanzarNotificacion('ESTADO ACTUALIZADO', `El kit ${prod.name} fue ${estadoTxt}.`, 'push');
      },
      error: (err) => console.error('Error al cambiar estado:', err)
    });
  }

  abrirModalEdicion(prod: any) {
    this.editando = true;
    this.kitEditandoId = prod.id;
    this.editNombre = prod.name;
    this.editMarca = prod.marca || '';
    this.editCategoria = prod.category || '';
    this.editPrecio = prod.price;
    this.editStock = prod.stock;
    this.editImagen = prod.imageUrl || '';
    this.editDescripcion = prod.description;
  }

  cancelarEdicion() {
    this.editando = false;
    this.kitEditandoId = null;
  }

  guardarEdicion() {
    if (this.kitEditandoId === null) return;

    const kitActualizado = {
      name: this.editNombre,
      marca: this.editMarca,
      category: this.editCategoria,
      price: Number(this.editPrecio),
      stock: Number(this.editStock),
      imageUrl: this.editImagen,
      description: this.editDescripcion
    };

    this.voltexApi.actualizarProducto(this.kitEditandoId, kitActualizado).subscribe({
      next: () => {
        this.cargarInventarioReal();
        this.state.lanzarNotificacion('KIT MODIFICADO', `Se actualizaron los datos de ${this.editNombre}.`, 'push');
        this.cancelarEdicion();
      },
      error: (err) => console.error('Error al actualizar:', err)
    });
  }

  confirmarEliminar(prodOrId: any) {
    const id = typeof prodOrId === 'object' && prodOrId !== null ? prodOrId.id : prodOrId;
    this.kitAEliminarId = id;
    this.mostrandoConfirmacion = true;
  }

  confirmarEliminacion(id: number) {
    this.confirmarEliminar(id);
  }

  cancelarEliminacion() {
    this.kitAEliminarId = null;
    this.mostrandoConfirmacion = false;
  }

  ejecutarEliminacion() {
    if (this.kitAEliminarId === null) return;

    this.voltexApi.eliminarProducto(this.kitAEliminarId).subscribe({
      next: () => {
        this.cargarInventarioReal();
        this.state.lanzarNotificacion('KIT ELIMINADO', 'Se retiró permanentemente el componente del sistema.', 'push');
        this.cancelarEliminacion();
      },
      error: (err) => console.error('Error al eliminar:', err)
    });
  }

  cargarNotificaciones() {
    this.cargarNotificacionesReales();
  }

  cargarNotificacionesReales() {
    const apiAny = this.voltexApi as any;
    const req$ = apiAny.getNotificaciones
      ? apiAny.getNotificaciones(true)
      : null;

    if (!req$) return;

    req$.subscribe({
      next: (notifsBD: any) => {
        this.state.notificaciones.set(Array.isArray(notifsBD) ? notifsBD : []);
        this.mensajeNotif = '';
      },
      error: (err: any) => {
        console.error('Error al cargar notificaciones de MySQL:', err);
        this.mensajeNotif = 'No se pudieron cargar las notificaciones desde el servidor.';
      }
    });
  }

  private resolverFechaObjetivo(horaInput: string): Date | null {
    const limpio = horaInput.trim();
    if (!limpio) return null;

    const fechaDirecta = new Date(limpio);
    if (limpio.includes('T') && !isNaN(fechaDirecta.getTime())) {
      return fechaDirecta;
    }

    const match24 = limpio.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      const horas = Number(match24[1]);
      const minutos = Number(match24[2]);
      const segundos = match24[3] ? Number(match24[3]) : 0;

      if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59 || segundos < 0 || segundos > 59) {
        return null;
      }

      const objetivo = new Date();
      objetivo.setHours(horas, minutos, segundos, 0);

      if (objetivo.getTime() <= Date.now()) {
        objetivo.setDate(objetivo.getDate() + 1);
      }
      return objetivo;
    }

    const match12 = limpio.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (match12) {
      let horas = Number(match12[1]);
      const minutos = Number(match12[2]);
      const segundos = match12[3] ? Number(match12[3]) : 0;
      const periodo = match12[4].toLowerCase();

      if (horas < 1 || horas > 12 || minutos < 0 || minutos > 59 || segundos < 0 || segundos > 59) {
        return null;
      }

      if (periodo === 'pm' && horas < 12) {
        horas += 12;
      } else if (periodo === 'am' && horas === 12) {
        horas = 0;
      }

      const objetivo = new Date();
      objetivo.setHours(horas, minutos, segundos, 0);

      if (objetivo.getTime() <= Date.now()) {
        objetivo.setDate(objetivo.getDate() + 1);
      }
      return objetivo;
    }

    return null;
  }

  private leerProgramadasStorage(): AlertaProgramada[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_PROGRAMADAS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private guardarProgramadasStorage(lista: AlertaProgramada[]): void {
    try {
      localStorage.setItem(this.STORAGE_PROGRAMADAS_KEY, JSON.stringify(lista));
    } catch (err) {
      console.warn('No se pudieron guardar alertas programadas:', err);
    }
  }

  private restaurarAlertasProgramadas(): void {
    const ahora = Date.now();
    const pendientes = this.leerProgramadasStorage().filter(
      (item) => item.timestampObjetivo > ahora
    );
    this.guardarProgramadasStorage(pendientes);

    pendientes.forEach((alerta) => {
      this.programarDisparoEnTiempoReal(alerta);
    });
  }

  private async dispararAlertaEnHora(alerta: AlertaProgramada): Promise<void> {
    this.timersActivos.delete(alerta.id);

    const restantes = this.leerProgramadasStorage().filter((item) => item.id !== alerta.id);
    this.guardarProgramadasStorage(restantes);

    this.state.lanzarNotificacion(alerta.titulo, alerta.mensaje, 'push', alerta.horaTexto);

    try {
      // @ts-ignore
      if (typeof LocalNotifications !== 'undefined') {
        // @ts-ignore
        await LocalNotifications.schedule({
          notifications: [
            {
              title: alerta.titulo,
              body: alerta.mensaje,
              id: Number(alerta.id.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 100000),
              schedule: { at: new Date(alerta.timestampObjetivo) }
            }
          ]
        });
      }
    } catch (e) {
      console.log('Notificación nativa no disponible en web', e);
    }
  }

  private programarDisparoEnTiempoReal(alerta: AlertaProgramada): void {
    if (this.timersActivos.has(alerta.id)) {
      clearTimeout(this.timersActivos.get(alerta.id)!);
    }

    const delayMs = Math.max(0, alerta.timestampObjetivo - Date.now());
    const timer = setTimeout(() => {
      void this.dispararAlertaEnHora(alerta);
    }, delayMs);

    this.timersActivos.set(alerta.id, timer);
  }

  enviarAlertaPush() {
    if (!this.notifTitulo.trim() || !this.notifMensaje.trim() || !this.notifHora.trim()) return;

    const horaTexto = this.notifHora.trim();
    const fechaObjetivo = this.resolverFechaObjetivo(horaTexto);

    if (!fechaObjetivo) {
      this.mensajeNotif = 'Ingresa una hora válida (por ejemplo: 16:00 o 4:00 PM).';
      return;
    }

    const nuevaAlerta = {
      titulo: this.notifTitulo.trim(),
      mensaje: this.notifMensaje.trim(),
      horaProgramada: horaTexto,
      fechaHoraProgramada: fechaObjetivo.toISOString(),
      tipo: 'push'
    };

    (this.voltexApi.enviarNotificacion(nuevaAlerta) as any).subscribe({
      next: async (creada: any) => {
        const listaActual = this.state.notificaciones() || [];
        this.state.notificaciones.set([
          creada && creada.id
            ? creada
            : {
                id: `temp-${Date.now()}`,
                titulo: nuevaAlerta.titulo,
                mensaje: nuevaAlerta.mensaje,
                horaProgramada: nuevaAlerta.horaProgramada,
                tipo: nuevaAlerta.tipo,
                leida: false
              },
          ...listaActual
        ]);

        this.cargarNotificacionesReales();

        const alertaProgramada: AlertaProgramada = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          titulo: nuevaAlerta.titulo,
          mensaje: nuevaAlerta.mensaje,
          horaTexto: nuevaAlerta.horaProgramada,
          timestampObjetivo: fechaObjetivo.getTime()
        };

        const actuales = this.leerProgramadasStorage();
        actuales.push(alertaProgramada);
        this.guardarProgramadasStorage(actuales);
        this.programarDisparoEnTiempoReal(alertaProgramada);

        try {
          // @ts-ignore
          if (typeof LocalNotifications !== 'undefined') {
            // @ts-ignore
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: alertaProgramada.titulo,
                  body: alertaProgramada.mensaje,
                  id: Number(alertaProgramada.id.replace(/\D/g, '').slice(-8)) || Math.floor(Math.random() * 100000),
                  schedule: { at: fechaObjetivo }
                }
              ]
            });
          }
        } catch (e) {
          console.log('Notificación nativa no disponible en web', e);
        }

        const horaFormateada = fechaObjetivo.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        this.notifTitulo = '';
        this.notifMensaje = '';
        this.notifHora = '';
        this.mensajeNotif = `Alerta guardada y programada para las ${horaFormateada}.`;
      },
      error: (err: any) => {
        console.error('Error al guardar notificación:', err);
        this.mensajeNotif = 'Ocurrió un error al guardar la notificación.';
      }
    });
  }

  iniciarEdicionNotif(notif: any) {
    this.editandoNotifId = notif.id;
    this.editNotifTitulo = notif.titulo || '';
    this.editNotifMensaje = notif.mensaje || '';
    this.editNotifHora = notif.horaProgramada || '';
  }

  cancelarEdicionNotif() {
    this.editandoNotifId = null;
    this.editNotifTitulo = '';
    this.editNotifMensaje = '';
    this.editNotifHora = '';
  }

  guardarEdicionNotif(notif: any) {
    if (!notif?.id || !this.editNotifTitulo.trim() || !this.editNotifMensaje.trim()) {
      return;
    }

    const payload = {
      titulo: this.editNotifTitulo.trim(),
      mensaje: this.editNotifMensaje.trim(),
      horaProgramada: (this.editNotifHora || notif.horaProgramada || 'Ahora').trim(),
      tipo: notif.tipo || 'push'
    };

    const apiAny = this.voltexApi as any;
    const req$ = apiAny.editarNotificacion
      ? apiAny.editarNotificacion(notif.id, payload)
      : apiAny.actualizarNotificacion
        ? apiAny.actualizarNotificacion(notif.id, payload)
        : null;

    if (!req$) {
      console.warn('Agrega editarNotificacion(id, data) en VoltexApiService.');
      return;
    }

    req$.subscribe({
      next: () => {
        this.cancelarEdicionNotif();
        this.cargarNotificacionesReales();
        this.mensajeNotif = 'Notificación actualizada.';
      },
      error: (err: any) => {
        console.error('Error al editar notificación:', err);
        this.mensajeNotif = 'No se pudo editar la notificación.';
      }
    });
  }

  marcarNotificacionLeida(notif: any) {
    if (!notif?.id) return;
    const apiAny = this.voltexApi as any;
    const req$ = apiAny.marcarNotificacionLeida
      ? apiAny.marcarNotificacionLeida(notif.id)
      : apiAny.leerNotificacion
        ? apiAny.leerNotificacion(notif.id)
        : null;

    if (!req$) {
      console.warn('Agrega marcarNotificacionLeida(id) en VoltexApiService para persistir en BD.');
      return;
    }

    req$.subscribe({
      next: () => {
        this.cargarNotificacionesReales();
      },
      error: (err: any) => console.error('Error al marcar notificación como leída:', err)
    });
  }

  eliminarNotificacion(notif: any) {
    if (!notif?.id) return;
    const apiAny = this.voltexApi as any;
    const req$ = apiAny.eliminarNotificacion
      ? apiAny.eliminarNotificacion(notif.id)
      : apiAny.borrarNotificacion
        ? apiAny.borrarNotificacion(notif.id)
        : null;

    if (!req$) {
      console.warn('Agrega eliminarNotificacion(id) en VoltexApiService para borrar en BD.');
      return;
    }

    req$.subscribe({
      next: () => {
        const listaActual = this.state.notificaciones() || [];
        this.state.notificaciones.set(listaActual.filter((item: any) => item.id !== notif.id));
        this.cargarNotificacionesReales();
        this.mensajeNotif = 'Notificación eliminada.';
      },
      error: (err: any) => console.error('Error al eliminar notificación:', err)
    });
  }

  // ==================== MANUALES POR ID DE PRODUCTO (QR) ====================

  cargarManuales() {
    const apiAny = this.voltexApi as any;
    if (!apiAny.getManuales) return;

    apiAny.getManuales().subscribe({
      next: async (res: any) => {
        const lista = Array.isArray(res) ? res : res?.data || [];
        this.manuales = lista.map((m: any) => {
          const prodId = m.productId ?? m.productoId;
          return {
            ...m,
            productoId: prodId,
            titulo: m.title ?? m.titulo,
            url: m.manualUrl ?? m.url,
            notas: m.notes ?? m.notas,
            nombreProducto:
              m.product?.name ||
              this.state.productos().find((p: any) => p.id === prodId)?.name ||
              `Producto #${prodId}`
          };
        });
        await this.generarQrsDeManuales();
      },
      error: (err: any) => {
        console.error('Error al cargar manuales:', err);
      }
    });
  }

  private async generarQrsDeManuales() {
    this.qrImagenes.clear();
    for (const m of this.manuales) {
      if (!m?.productoId) continue;
      try {
        const dataUrl = await QRCode.toDataURL(this.getUrlQrManual(m.productoId), {
          width: 240,
          margin: 2
        });
        this.qrImagenes.set(m.productoId, dataUrl);
      } catch (err) {
        console.error(`Error generando QR para producto #${m.productoId}:`, err);
      }
    }
  }

  getQrDataUrl(productId: number): string | undefined {
    return this.qrImagenes.get(productId);
  }

  async descargarQrManual(productId: number, nombreManual?: string) {
    const url = this.getUrlQrManual(productId);
    const dataUrl =
      this.qrImagenes.get(productId) ||
      (await QRCode.toDataURL(url, {
        width: 512,
        margin: 2
      }));

    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    const slug = (nombreManual || `producto-${productId}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    enlace.download = `qr-manual-${productId}-${slug}.png`;
    enlace.click();
    this.mensajeManual = `QR descargado para el producto #${productId}.`;
  }

  onManualArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;

    this.manualArchivoFile = file;
    this.manualArchivoNombre = file.name;
  }

  guardarManualProducto() {
    if (!this.manualProductoId || !this.manualTitulo.trim()) {
      this.mensajeManual = 'Selecciona un producto y completa el título del manual.';
      return;
    }

    const apiAny = this.voltexApi as any;

    if (this.manualArchivoFile) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.mensajeManual = 'Para subir un archivo PDF necesitas conexión a internet.';
        return;
      }

      if (!apiAny.subirManualArchivo) {
        this.mensajeManual = 'Falta subirManualArchivo en VoltexApiService.';
        return;
      }

      const formData = new FormData();
      formData.append('file', this.manualArchivoFile);
      formData.append('productId', String(this.manualProductoId));
      formData.append('title', this.manualTitulo.trim());
      if (this.manualNotas.trim()) {
        formData.append('notes', this.manualNotas.trim());
      }

      apiAny.subirManualArchivo(formData).subscribe({
        next: () => {
          this.mensajeManual = `PDF "${this.manualArchivoNombre}" subido y vinculado al producto #${this.manualProductoId}.`;
          this.limpiarFormularioManual();
          this.cargarManuales();
        },
        error: (err: any) => {
          console.error('Error al subir manual:', err);
          this.mensajeManual = err?.error?.message || 'No se pudo subir el PDF.';
        }
      });
      return;
    }

    if (!this.manualUrl.trim()) {
      this.mensajeManual = 'Selecciona un PDF de tu lap o ingresa una URL.';
      return;
    }

    if (!apiAny.guardarManualProducto) {
      this.mensajeManual = 'Falta guardarManualProducto en VoltexApiService.';
      return;
    }

    apiAny
      .guardarManualProducto({
        productId: Number(this.manualProductoId),
        title: this.manualTitulo.trim(),
        manualUrl: this.manualUrl.trim(),
        fileName: this.manualArchivoNombre || undefined,
        notes: this.manualNotas.trim() || undefined
      })
      .subscribe({
        next: () => {
          this.mensajeManual = `Manual vinculado al producto #${this.manualProductoId}.`;
          this.limpiarFormularioManual();
          this.cargarManuales();
        },
        error: (err: any) => {
          console.error('Error al guardar manual:', err);
          this.mensajeManual = err?.error?.message || 'No se pudo guardar el manual.';
        }
      });
  }

  private limpiarFormularioManual() {
    this.manualProductoId = null;
    this.manualTitulo = '';
    this.manualUrl = '';
    this.manualArchivoNombre = '';
    this.manualArchivoFile = null;
    this.manualNotas = '';
  }

  getUrlQrManual(productId: number): string {
    const origen = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origen}/qr-scanner?productId=${productId}`;
  }

  copiarEnlaceQrManual(productId: number) {
    const url = this.getUrlQrManual(productId);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      this.mensajeManual = `Enlace QR copiado: ${url}`;
    }
  }

  eliminarManualProducto(productId: number) {
    const apiAny = this.voltexApi as any;
    if (!apiAny.eliminarManualProducto) return;

    apiAny.eliminarManualProducto(productId).subscribe({
      next: () => {
        this.mensajeManual = `Manual desvinculado del producto #${productId}.`;
        this.cargarManuales();
      },
      error: (err: any) => {
        console.error('Error al eliminar manual:', err);
        this.mensajeManual = 'No se pudo desvincular el manual.';
      }
    });
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}