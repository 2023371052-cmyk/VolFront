import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ComparadorService } from './comparar.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './comparar.html',
  styleUrls: ['./comparar.css']
})
export class CompararComponent implements OnInit, OnDestroy {
  private subIds?: Subscription;
  private sincronizandoIds = false;

  productosParaComparar: any[] = [];
  idsSeleccionados: (number | string)[] = [];

  usuarioActual: any = null;
  sesionActiva: boolean = false;
  usuarioIdActual: string | number = 'invitado';

  constructor(
    private comparadorService: ComparadorService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Optional() private state?: VoltexStateService
  ) {}

  ngOnInit(): void {
    this.detectarSesionActiva();
    this.sincronizarUsuarioConComparador();
    this.comparadorService.obtenerIdsSincronizados(this.usuarioIdActual);

    this.subIds = this.comparadorService.ids$.subscribe((ids: any[]) => {
      if (this.sincronizandoIds) return;

      const lista = Array.isArray(ids) && ids.length > 0
        ? ids
        : this.comparadorService.getIdsActuales();

      this.idsSeleccionados = Array.isArray(lista) ? lista : [];

      if (this.idsSeleccionados.length > 0) {
        this.cargarDatosComparacion(this.idsSeleccionados);
      } else {
        this.productosParaComparar = [];
        this.cdr.detectChanges();
      }
    });
  }

  @HostListener('window:pagehide')
  @HostListener('window:beforeunload')
  onSalirDePagina(): void {
    this.detectarSesionActiva();
    if (!this.sesionActiva && !this.comparadorService.tieneSesionActiva()) {
      this.comparadorService.limpiarSiEsInvitadoAlSalir();
    }
  }

  ngOnDestroy(): void {
    this.subIds?.unsubscribe();

    // Solo limpia automáticamente si NO tiene sesión iniciada al salir
    this.detectarSesionActiva();
    if (!this.sesionActiva && !this.comparadorService.tieneSesionActiva()) {
      this.comparadorService.limpiarSiEsInvitadoAlSalir();
    }
  }

  regresar(): void {
    this.detectarSesionActiva();
    const estaLogueado = Boolean(
      this.sesionActiva || this.comparadorService.tieneSesionActiva()
    );

    if (estaLogueado) {
      this.router.navigate(['/usuario']);
    } else {
      // Si tu landing page tiene otra ruta en app.routes.ts (ej. '/landing'), cámbiala aquí
      this.router.navigate(['/']);
    }
  }

  detectarSesionActiva(): void {
    let user: any = null;
    const estadoGlobal: any = this.state;

    if (estadoGlobal?.usuarioActual) {
      user =
        typeof estadoGlobal.usuarioActual === 'function'
          ? estadoGlobal.usuarioActual()
          : estadoGlobal.usuarioActual;
    }

    if (!user) {
      try {
        const posiblesClaves = [
          'voltex_user',
          'usuarioActual',
          'user',
          'sessionUser',
          'currentUser',
          'auth_user',
          'usuario'
        ];
        for (const clave of posiblesClaves) {
          const raw = localStorage.getItem(clave) || sessionStorage.getItem(clave);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.email || parsed.id || parsed.userId || parsed.nombre || parsed.name)) {
              user = parsed;
              break;
            }
          }
        }
      } catch {
        // Ignora errores de acceso a almacenamiento
      }
    }

    if (user && (user.email || user.id || user.userId || user.usuarioId || user.sub)) {
      this.usuarioActual = user;
      this.sesionActiva = true;
      this.usuarioIdActual =
        user.id ?? user.userId ?? user.usuarioId ?? user.sub ?? user.email ?? 'invitado';
    } else {
      this.usuarioActual = null;
      this.sesionActiva = false;
      this.usuarioIdActual = 'invitado';
    }
  }

  private sincronizarUsuarioConComparador(): void {
    this.comparadorService.establecerUsuario(this.usuarioIdActual);
    this.sesionActiva = this.comparadorService.tieneSesionActiva();
    this.usuarioIdActual = this.comparadorService.getUsuarioIdActual();
  }

  private extraerArreglo(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.productos)) return data.productos;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.result)) return data.result;
    return [];
  }

  private obtenerIdProducto(item: any): string {
    const candidatoId =
      item?.id ??
      item?._id ??
      item?.id_producto ??
      item?.productoId ??
      '';
    return String(candidatoId).trim();
  }

  private filtrarPorIdsSeleccionados(lista: any[], ids: (number | string)[]): any[] {
    const idsSet = new Set(ids.map((id) => String(id).trim()));
    return lista.filter((item: any) => {
      const itemId = this.obtenerIdProducto(item);
      return itemId !== '' && idsSet.has(itemId);
    });
  }

  private sincronizarIdsExistentes(idsSolicitados: (number | string)[], productosEncontrados: any[]): void {
    if (!Array.isArray(idsSolicitados) || idsSolicitados.length === 0) return;

    const idsValidos = new Set<string>();
    for (const prod of productosEncontrados) {
      const idStr = this.obtenerIdProducto(prod);
      if (idStr !== '') {
        idsValidos.add(idStr);
      }
    }

    const idsLimpios = idsSolicitados
      .map((id) => String(id).trim())
      .filter((idStr) => idsValidos.has(idStr))
      .map((idStr) => (isNaN(Number(idStr)) ? idStr : Number(idStr)));

    if (idsLimpios.length !== idsSolicitados.length) {
      this.sincronizandoIds = true;
      this.comparadorService.limpiarComparacion();
      for (const id of idsLimpios.slice(0, 3)) {
        this.comparadorService.agregarId(id as number);
      }
      this.idsSeleccionados = this.comparadorService.getIdsActuales();
      this.sincronizandoIds = false;
    }
  }

  private obtenerProductosDesdeState(): any[] {
    const estadoGlobal: any = this.state;
    if (!estadoGlobal) return [];

    const candidatos = [
      estadoGlobal.productos,
      estadoGlobal.catalogo,
      estadoGlobal.listaProductos,
      estadoGlobal.items
    ];

    for (const fuente of candidatos) {
      if (typeof fuente === 'function') {
        const val = fuente();
        if (Array.isArray(val) && val.length > 0) return val;
      } else if (Array.isArray(fuente) && fuente.length > 0) {
        return fuente;
      }
    }

    return [];
  }

  cargarDatosComparacion(ids: (number | string)[]): void {
    const idsString = ids.map((id) => encodeURIComponent(String(id))).join(',');

    this.http
      .get(`${environment.apiUrl}/productos/comparar/lista?ids=${idsString}`)
      .subscribe({
        next: (data: any) => {
          const lista = this.extraerArreglo(data);
          if (lista.length > 0) {
            const filtrados = this.filtrarPorIdsSeleccionados(lista, ids);
            this.productosParaComparar = filtrados.length > 0 ? filtrados : lista;
            if (filtrados.length > 0) {
              this.sincronizarIdsExistentes(ids, filtrados);
            }
            this.cdr.detectChanges();
          } else {
            this.cargarDesdeRespaldoLocalOApi(ids);
          }
        },
        error: () => {
          this.cargarDesdeRespaldoLocalOApi(ids);
        }
      });
  }

  private cargarDesdeRespaldoLocalOApi(ids: (number | string)[]): void {
    const desdeState = this.obtenerProductosDesdeState();
    const filtradosState = this.filtrarPorIdsSeleccionados(desdeState, ids);

    if (filtradosState.length > 0) {
      this.productosParaComparar = filtradosState;
      this.sincronizarIdsExistentes(ids, filtradosState);
      this.cdr.detectChanges();
      return;
    }

    this.http.get(`${environment.apiUrl}/productos`).subscribe({
      next: (data: any) => {
        const todos = this.extraerArreglo(data);
        const filtrados = this.filtrarPorIdsSeleccionados(todos, ids);
        this.productosParaComparar = filtrados.length > 0 ? filtrados : todos.filter((_, idx) => idx < ids.length);
        if (filtrados.length > 0) {
          this.sincronizarIdsExistentes(ids, filtrados);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar productos para comparar:', err);
        this.productosParaComparar = [];
        this.cdr.detectChanges();
      }
    });
  }

  eliminarDeLista(id: number | string): void {
    this.comparadorService.removerId(id as number);
  }

  trackByProducto(index: number, prod: any): string | number {
    return prod?.id ?? prod?._id ?? prod?.id_producto ?? prod?.productoId ?? index;
  }
}