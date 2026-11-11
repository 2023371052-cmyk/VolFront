import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-filters.component.html',
  styleUrl: './sidebar-filters.component.css',
})
export class SidebarFiltersComponent implements OnInit {
  [x: string]: any;

  // Emisor de eventos para mandar los filtros activos al componente principal
  @Output() filtrosChange = new EventEmitter<any>();

  // Variable para controlar si el menú de filtros está abierto o cerrado en celulares
  isFiltersOpen: boolean = false;

  // Listas que vendrán directamente de tu base de datos / API
  tiposCompresor: string[] = [];
  entregasPotencia: string[] = [];
  conexionesMecanicas: string[] = [];
  espaciosRequeridos: string[] = [];

  // Objeto para registrar las selecciones del usuario
  filtrosSeleccionados = {
    tipo: [] as string[],
    potencia: [] as string[],
    conexion: [] as string[],
    espacio: [] as string[]
  };

  ngOnInit() {
    this.cargarFiltrosDesdeBD();
  }

  // Función para abrir y cerrar el menú desplegable en pantallas móviles
  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen;
  }

  cargarFiltrosDesdeBD() {
    // Datos cargados para las opciones de la PWA de 7VOLTEX
    this.tiposCompresor = [
      'Centrífugos Pro-Mod / Outlaw', 
      'Roots de Alta Eficiencia', 
      'Twin-Screw de Grado de Carreras'
    ];
    this.entregasPotencia = [
      'Instantánea desde 0 RPM', 
      'Lineal / Progresiva'
    ];
    this.conexionesMecanicas = [
      'Correa Dentada (Cog Belt)', 
      'Engranaje Directo (Gear Drive)'
    ];
    this.espaciosRequeridos = [
      'Interno (Cierra capó original)', 
      'Externo (Cortar capó)'
    ];
  }

  onFiltroChange(categoria: string, valor: string, event: any) {
    const isChecked = event.target.checked;
    
    if (!this.filtrosSeleccionados[categoria as keyof typeof this.filtrosSeleccionados]) {
      // Control de respaldo dinámico usando tu indexador [x: string]
    }

    if (isChecked) {
      this.filtrosSeleccionados[categoria as keyof typeof this.filtrosSeleccionados].push(valor);
    } else {
      this.filtrosSeleccionados[categoria as keyof typeof this.filtrosSeleccionados] = 
        this.filtrosSeleccionados[categoria as keyof typeof this.filtrosSeleccionados].filter(item => item !== valor);
    }

    this.filtrosChange.emit(this.filtrosSeleccionados);
  }
}