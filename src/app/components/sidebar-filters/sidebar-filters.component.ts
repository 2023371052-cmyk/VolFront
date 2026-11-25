import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CategoriaFiltro = 'potencia' | 'conexion' | 'espacio' | 'disponibilidad';

export interface FiltrosActivos7Voltex {
  potencia: string[];
  conexion: string[];
  espacio: string[];
  disponibilidad: string[];
}

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-filters.component.html',
  styleUrl: './sidebar-filters.component.css',
})
export class SidebarFiltersComponent implements OnInit, OnChanges {
  @Input() productos: any[] = [];

  // Emisor de eventos para mandar los filtros activos al componente principal
  @Output() filtrosChange = new EventEmitter<FiltrosActivos7Voltex>();

  // Emisor directo con los productos ya filtrados según sus características
  @Output() productosFiltradosChange = new EventEmitter<any[]>();

  isFiltersOpen: boolean = false;

  entregasPotencia: string[] = [];
  conexionesMecanicas: string[] = [];
  espaciosRequeridos: string[] = [];
  disponibilidades: string[] = [];

  filtrosSeleccionados: FiltrosActivos7Voltex = {
    potencia: [],
    conexion: [],
    espacio: [],
    disponibilidad: []
  };

  ngOnInit(): void {
    this.cargarFiltrosDesdeBD();
    this.emitirFiltros();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productos']) {
      this.productosFiltradosChange.emit(this.filtrarProductos(this.productos));
    }
  }

  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen;
  }

  cargarFiltrosDesdeBD(): void {
    this.entregasPotencia = [
      'Complete Kit',
      'Tuner Kit',
      'Refaccion'
    ];

    this.conexionesMecanicas = [
      'Supercargadores',
      'Cabezales',
      'Poleas y Bandas',
      'Valvulas',
      'Refacciones',
      'Consumibles'
    ];

    this.espaciosRequeridos = [
      'Aire-Agua',
      'Aire-Aire',
      'No incluye'
    ];

    this.disponibilidades = [
      'En Stock MX',
      'Sobre Pedido'
    ];
  }

  estaSeleccionado(categoria: CategoriaFiltro, valor: string): boolean {
    return this.filtrosSeleccionados[categoria].includes(valor);
  }

  onFiltroChange(categoria: CategoriaFiltro, valor: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const isChecked = !!input?.checked;
    const listaActual = this.filtrosSeleccionados[categoria];

    if (isChecked) {
      if (!listaActual.includes(valor)) {
        this.filtrosSeleccionados[categoria] = [...listaActual, valor];
      }
    } else {
      this.filtrosSeleccionados[categoria] = listaActual.filter((item) => item !== valor);
    }

    this.emitirFiltros();
  }

  quitarFiltro(categoria: CategoriaFiltro, valor: string): void {
    this.filtrosSeleccionados[categoria] = this.filtrosSeleccionados[categoria].filter(
      (item) => item !== valor
    );
    this.emitirFiltros();
  }

  limpiarFiltros(): void {
    this.filtrosSeleccionados = {
      potencia: [],
      conexion: [],
      espacio: [],
      disponibilidad: []
    };
    this.emitirFiltros();
  }

  obtenerTodosSeleccionados(): { categoria: CategoriaFiltro; valor: string }[] {
    const seleccionados: { categoria: CategoriaFiltro; valor: string }[] = [];
    (Object.keys(this.filtrosSeleccionados) as CategoriaFiltro[]).forEach((categoria) => {
      this.filtrosSeleccionados[categoria].forEach((valor) => {
        seleccionados.push({ categoria, valor });
      });
    });
    return seleccionados;
  }

  private normalizar(texto: any): string {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  // Filtra cualquier lista de productos usando las características reales del catálogo
  public filtrarProductos(lista: any[] = this.productos): any[] {
    const base = Array.isArray(lista) ? lista : [];

    return base.filter((p: any) => {
      const nivelProd = this.normalizar(p.nivel_kit);
      const catProd = this.normalizar(p.category || p.categoria);
      const enfProd = this.normalizar(p.enfriamiento);
      const dispProd = this.normalizar(p.disponibilidad);

      // Dentro de la misma categoría se usa OR (si marcas dos enfriamientos, muestra ambos)
      const pasaPotencia =
        this.filtrosSeleccionados.potencia.length === 0 ||
        this.filtrosSeleccionados.potencia.some((v) => nivelProd === this.normalizar(v));

      const pasaConexion =
        this.filtrosSeleccionados.conexion.length === 0 ||
        this.filtrosSeleccionados.conexion.some((v) => catProd === this.normalizar(v));

      const pasaEspacio =
        this.filtrosSeleccionados.espacio.length === 0 ||
        this.filtrosSeleccionados.espacio.some((v) => enfProd === this.normalizar(v));

      const pasaDisponibilidad =
        this.filtrosSeleccionados.disponibilidad.length === 0 ||
        this.filtrosSeleccionados.disponibilidad.some((v) => dispProd === this.normalizar(v));

      // Entre categorías distintas se usa AND (debe cumplir todos los grupos activos)
      return pasaPotencia && pasaConexion && pasaEspacio && pasaDisponibilidad;
    });
  }

  private emitirFiltros(): void {
    const copia: FiltrosActivos7Voltex = {
      potencia: [...this.filtrosSeleccionados.potencia],
      conexion: [...this.filtrosSeleccionados.conexion],
      espacio: [...this.filtrosSeleccionados.espacio],
      disponibilidad: [...this.filtrosSeleccionados.disponibilidad]
    };

    this.filtrosChange.emit(copia);
    this.productosFiltradosChange.emit(this.filtrarProductos(this.productos));
  }
}