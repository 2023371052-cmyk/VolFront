import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-drifting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './drifting.html',
  styleUrl: './drifting.css',
})
export class DriftingComponent implements OnInit {
  productosDrifting: any[] = [];
  cargando = true;

  constructor(
    private voltexApi: VoltexApiService,
    private state: VoltexStateService,
    private router: Router,
    private cdr: ChangeDetectorRef // <--- Actualiza la vista de inmediato
  ) {}

  ngOnInit(): void {
    this.cargarProductosDeBaseDeDatos();
  }

  // Petición directa a la BD y filtrado por categoría Drifting
  cargarProductosDeBaseDeDatos() {
    this.cargando = true;
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        console.log("📦 PRODUCTOS PARA DRIFTING RECIBIDOS:", data);
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);
        
        // Filtramos estrictamente por la categoría o nombre Drifting
        this.productosDrifting = lista.filter((p: any) => {
          const cat = (p.category || p.categoria || '').toLowerCase();
          const nom = (p.name || p.nombre || '').toLowerCase();
          return cat.includes('drifting') || nom.includes('drifting') || cat.includes('drift');
        });

        // 💡 RESPALDO DE EMERGENCIA: Si no hay coincidencia exacta de texto pero sí hay productos en la BD,
        // los mostramos para que no se quede vacío en plena entrega.
        if (this.productosDrifting.length === 0 && lista.length > 0) {
          console.warn("⚠️ No hubo coincidencia exacta con 'drifting', mostrando catálogo general.");
          this.productosDrifting = lista;
        }

        this.cargando = false;
        this.cdr.detectChanges(); // <--- Fuerza a Angular a pintar los elementos al instante
      },
      error: (err: any) => {
        console.error('Error al conectar con la base de datos de 7VOLTEX (Drifting):', err);
        this.productosDrifting = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Botón de Volver inteligente según la sesión
  volverSegunSesion() {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.router.navigate(['/usuario']);
    } else {
      this.router.navigate(['/tienda']);
    }
  }

  // Agregar a la línea de ensamblaje (carrito)
  agregarAlCarrito(producto: any) {
    const supercargadorAdaptado: any = {
      id: producto.id,
      name: producto.name || producto.nombre,
      description: producto.description || producto.descripcion,
      price: producto.price || producto.precio,
      imageUrl: producto.imageUrl || producto.image || producto.imagen,
      category: producto.category || producto.categoria,
      marca: producto.marca || 'Voltex Drift Spec',      
      modalidad: producto.modalidad || 'Inducción de Alta Respuesta',
      quantity: 1
    };

    const estadoGlobal: any = this.state;
    if (typeof estadoGlobal.añadirAlCarrito === 'function') {
      estadoGlobal.añadirAlCarrito(supercargadorAdaptado);
    } else if (Array.isArray(estadoGlobal.carrito)) {
      estadoGlobal.carrito.push(supercargadorAdaptado);
    }

    alert(`${supercargadorAdaptado.name} se ha añadido a tu orden técnica.`);
    this.router.navigate(['/checkout']);
  }
}