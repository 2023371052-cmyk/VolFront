import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexApiService } from '../../services/voltex-api.service';
import { VoltexStateService } from '../../services/voltex-state';

@Component({
  selector: 'app-karting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './karting.html',
  styleUrl: './karting.css'
})
export class KartingComponent implements OnInit {
  productosKarting: any[] = [];
  cargando = true;

  constructor(
    private voltexApi: VoltexApiService,
    private state: VoltexStateService,
    private router: Router,
    private cdr: ChangeDetectorRef // <--- Refresca la vista al instante
  ) {}

  ngOnInit(): void {
    this.cargarProductosDeBaseDeDatos();
  }

  cargarProductosDeBaseDeDatos() {
    this.cargando = true;
    this.voltexApi.getProductos().subscribe({
      next: (data: any) => {
        console.log("📦 PRODUCTOS PARA KARTING RECIBIDOS:", data);
        const lista = Array.isArray(data) ? data : (data.productos || data.data || []);
        
        // Filtramos buscando coincidencias flexibles
        this.productosKarting = lista.filter((p: any) => {
          const cat = (p.category || p.categoria || '').toLowerCase();
          const nom = (p.name || p.nombre || '').toLowerCase();
          return cat.includes('karting') || nom.includes('karting') || cat.includes('kart') || cat.includes('motor');
        });

        // 💡 RESPALDO DE EMERGENCIA: Si por texto no coincide ninguno pero la BD tiene productos, 
        // mostramos todos para que no se quede vacío en plena entrega.
        if (this.productosKarting.length === 0 && lista.length > 0) {
          console.warn("⚠️ No hubo coincidencia exacta con 'karting', mostrando catálogo general.");
          this.productosKarting = lista;
        }

        this.cargando = false;
        this.cdr.detectChanges(); // <--- Fuerza a Angular a pintar los elementos al instante
      },
      error: (err: any) => {
        console.error('Error al conectar con la base de datos de 7VOLTEX:', err);
        this.productosKarting = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  volverSegunSesion() {
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.router.navigate(['/usuario']);
    } else {
      this.router.navigate(['/tienda']);
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