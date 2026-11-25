import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
import { SidebarFiltersComponent } from '../../components/sidebar-filters/sidebar-filters.component';
import { ComparadorService } from '../../services/comparar/comparar.service';

export interface SlideHero {
  badge: string;
  titulo: string;
  subtitulo: string;
  imagen?: string;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarFiltersComponent],
  templateUrl: './store.component.html',
  styleUrl: './store.component.css'
})
export class StoreComponent implements OnInit, OnDestroy {

  // ==========================================
  // CONFIGURACIÓN DEL CARRUSEL HERO DINÁMICO
  // Coloca tus archivos dentro de `public/assets/...` y úsalos como `'assets/...'`
  // ==========================================
  slides: SlideHero[] = [
    {
      badge: '⚡ Tecnología de Alto Flujo',
      titulo: 'Kits de Supercargadores 7VOLTEX',
      subtitulo: 'Potencia extrema y respuesta inmediata para modalidades Karting, Rally, Fórmula y Drifting.',
      imagen: 'assets/carro2.jpg'
    },
    {
      badge: '🏎️ Ingeniería de Precisión',
      titulo: 'Compresores de Grado de Carreras',
      subtitulo: 'Twin-Screw y Centrífugos Pro-Mod diseñados para maximizar el rendimiento de tu motor.',
      imagen: 'assets/carro1.png'
    },
    {
      badge: '⚙️ Conexión Mecánica Eficiente',
      titulo: 'Sistemas de Transmisión Directa y Correa',
      subtitulo: 'Optimización de espacio interno y externo con adaptabilidad superior.',
      imagen: 'assets/carro3.jpeg'
    }
  ];

  currentIndex: number = 0;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private readonly tiempoAutoplayMs = 5000;

  // ==========================================
  // ESTADO DE FILTROS DEL SIDEBAR + BUSCADOR
  // ==========================================
  private _productosFiltrados: any[] = [];
  hayFiltrosActivos: boolean = false;

  get productosFiltrados(): any[] {
    return this._productosFiltrados;
  }

  set productosFiltrados(lista: any[]) {
    this._productosFiltrados = Array.isArray(lista) ? lista : [];
  }

  private normalizarTexto(valor: any): string {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private obtenerTextoBusquedaActual(): string {
    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.busqueda === 'function') {
      return String(estadoGlobal.busqueda() || '');
    }
    return String(estadoGlobal.busqueda ?? estadoGlobal.terminoBusqueda ?? '');
  }

  get productosVisibles(): any[] {
    const todos = this.state.productos() || [];
    const base = !this.hayFiltrosActivos && this._productosFiltrados.length === 0
      ? todos
      : this._productosFiltrados;

    const query = this.normalizarTexto(this.obtenerTextoBusquedaActual());
    if (!query) {
      return base;
    }

    return base.filter((p: any) => {
      const campos = [
        p.nombre, p.name,
        p.sku,
        p.marca,
        p.plataforma_motor,
        p.tipo_supercargador,
        p.nivel_kit,
        p.enfriamiento,
        p.disponibilidad,
        p.categoria, p.category,
        p.descripcion, p.description
      ];
      return campos.some((campo) => this.normalizarTexto(campo).includes(query));
    });
  }

  constructor(
    public state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private comparadorService: ComparadorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductosReales();
    this.iniciarAutoplay();
  }

  ngOnDestroy(): void {
    this.detenerAutoplay();
  }

  iniciarAutoplay(): void {
    this.detenerAutoplay();
    if (this.slides.length <= 1) return;

    this.intervalo = setInterval(() => {
      this.siguienteSlide(false);
    }, this.tiempoAutoplayMs);
  }

  detenerAutoplay(): void {
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  // Cambiar manualmente de slide con los puntos indicadores
  irASlide(index: number): void {
    if (this.slides.length === 0) return;
    this.currentIndex = ((index % this.slides.length) + this.slides.length) % this.slides.length;
    this.iniciarAutoplay();
  }

  siguienteSlide(reiniciarTimer = true): void {
    if (this.slides.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    if (reiniciarTimer) {
      this.iniciarAutoplay();
    }
  }

  anteriorSlide(): void {
    if (this.slides.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.iniciarAutoplay();
  }

  onFiltrosSidebarChange(filtros: any) {
    this.hayFiltrosActivos =
      (filtros?.potencia?.length || 0) > 0 ||
      (filtros?.conexion?.length || 0) > 0 ||
      (filtros?.espacio?.length || 0) > 0 ||
      (filtros?.disponibilidad?.length || 0) > 0;
  }

  cargarProductosReales() {
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);
        this.state.setProductos(lista);
      },
      error: (err: any) => {
        console.error('Error al sincronizar inventario de Pits:', err);
      }
    });
  }

  // Función para agregar un supercargador al comparador
  agregarAComparacion(producto: any) {
    const id = producto.id || producto._id;
    const agregado = this.comparadorService.agregarId(id);
    if (agregado) {
      alert(`¡${producto.nombre || producto.name} agregado al comparador!`);
    }
  }

  agregarAlCarrito(producto: any) {
    const supercargadorAdaptado: any = {
      id: producto.id,
      nombre: producto.nombre || producto.name,
      descripcion: producto.descripcion || producto.description,
      precio: producto.precio || producto.price,
      imagen: producto.imagen || producto.image || producto.imageUrl,
      categoria: producto.categoria || producto.category,
      marca: producto.marca || 'Voltex Pro',
      modalidad: producto.modalidad || 'Inducción'
    };

    this.state.añadirAlCarrito(supercargadorAdaptado);
    alert(`${supercargadorAdaptado.nombre} añadido a la orden de pits.`);
    this.router.navigate(['/checkout']);
  }
}