import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-rally',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rally.html',
  styleUrl: './rally.css',
})
export class Rally implements OnInit {
  productosRally: any[] = [];
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

  // Consulta directa a la base de datos y filtrado por categoría Rally
  cargarProductosDeBaseDeDatos() {
    this.cargando = true;
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        console.log("📦 PRODUCTOS PARA RALLY RECIBIDOS:", data);
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);
        
        // Filtramos estrictamente por la categoría o nombre Rally
        this.productosRally = lista.filter((p: any) => {
          const cat = (p.category || p.categoria || '').toLowerCase();
          const nom = (p.name || p.nombre || '').toLowerCase();
          return cat.includes('rally') || nom.includes('rally');
        });

        // 💡 RESPALDO DE EMERGENCIA: Si no hay coincidencia exacta de texto pero sí hay productos en la BD,
        // los mostramos para que no se quede vacío en plena entrega.
        if (this.productosRally.length === 0 && lista.length > 0) {
          console.warn("⚠️ No hubo coincidencia exacta con 'rally', mostrando catálogo general.");
          this.productosRally = lista;
        }

        this.cargando = false;
        this.cdr.detectChanges(); // <--- Fuerza a Angular a pintar los elementos al instante
      },
      error: (err: any) => {
        console.error('Error al conectar con la base de datos de 7VOLTEX (Rally):', err);
        this.productosRally = [];
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
      marca: producto.marca || 'Voltex Rally Spec',      
      modalidad: producto.modalidad || 'Inducción Forzada Off-Road',
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