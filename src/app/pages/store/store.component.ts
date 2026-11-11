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
  // ==========================================
slides: SlideHero[] = [
    {
      badge: '⚡ Tecnología de Alto Flujo',
      titulo: 'Kits de Supercargadores 7VOLTEX',
      subtitulo: 'Potencia extrema y respuesta inmediata para modalidades Karting, Rally, Fórmula y Drifting.',
      imagen: 'src/app/assets/prueba.jpg'
    },
    {
      badge: '🏎️ Ingeniería de Precisión',
      titulo: 'Compresores de Grado de Carreras',
      subtitulo: 'Twin-Screw y Centrífugos Pro-Mod diseñados para maximizar el rendimiento de tu motor.',
      imagen: 'assets/prueba2.jpg'
    },
    {
      badge: '⚙️ Conexión Mecánica Eficiente',
      titulo: 'Sistemas de Transmisión Directa y Correa',
      subtitulo: 'Optimización de espacio interno y externo con adaptabilidad superior.',
      imagen: 'assets/prueba.jpg'
    }
  ];

  currentIndex: number = 0;
  intervalo: any;

  constructor(
    public state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private comparadorService: ComparadorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductosReales();
    
    // Inicia el movimiento automático del carrusel cada 5 segundos
    this.intervalo = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    }, 5000);
  }

  ngOnDestroy(): void {
    // Limpia el intervalo al salir del componente para evitar fugas de memoria
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  // Cambiar manualmente de slide con los puntos indicadores
  irASlide(index: number) {
    this.currentIndex = index;
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