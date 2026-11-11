import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterUsuario } from '../../components/footer-usuario/footer-usuario';
import { VoltexStateService } from '../../services/voltex-state';

// Definimos la estructura de los productos
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    FooterUsuario // <-- CORREGIDO: Usamos el nombre de la Clase con mayúsculas y sin guiones
  ],
  templateUrl: './usuario.html',
  styleUrl: './usuario.css'
})
// CORREGIDO: Cambiado de UsuarioComponent a Usuario para mantener tus specs limpios
export class Usuario implements OnInit { 
  
  usuarioEmail: string | null = null;

  // Catálogo estático de la tienda
  products: Product[] = [
    {
      id: 1,
      name: 'Batería Voltex Pro 500',
      description: 'Celda de alto rendimiento para telemetría avanzada y sistemas embebidos.',
      price: 2499.00,
      image: 'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?q=80&w=400',
      category: 'Energía'
    },
    {
      id: 2,
      name: 'Módulo de Telemetría V2',
      description: 'Transmisión de datos en tiempo real con soporte directo para alertas Apple Watch.',
      price: 1850.00,
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400',
      category: 'Electrónica'
    },
    {
      id: 3,
      name: 'Sensor IoT Industrial',
      description: 'Sensor de calibración exacta compatible con ecosistemas Docker y flujos de datos rápidos.',
      price: 899.00,
      image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400',
      category: 'Sensores'
    },
    {
      id: 4,
      name: 'Kit de Conectividad Escudería',
      description: 'Paquete de cables reforzados y conectores dorados para máxima velocidad de datos.',
      price: 620.00,
      image: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?q=80&w=400',
      category: 'Accesorios'
    }
  ];

  constructor(private state: VoltexStateService) {}

  ngOnInit(): void {
    // Recuperamos el correo del usuario del servicio global al iniciar la página
    const user = this.state.usuarioActual();
    if (user && user.email) {
      this.usuarioEmail = user.email;
    }
  }

  agregarAlCarrito(producto: Product) {
    this.state.lanzarNotificacion(
      'CARRITO ACTUALIZADO',
      `${producto.name} agregado con éxito.`,
      'push'
    );
    alert(`${producto.name} se ha añadido a tu orden técnica.`);
  }
}