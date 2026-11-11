import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';
// import { LocalNotifications } from '@capacitor/local-notifications'; // Descomenta si usas Capacitor

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  // Variables del formulario de creación
  nuevoNombre: string = '';
  nuevaMarca: string = '';
  nuevaCategoria: string = ''; 
  nuevoPrecio: number | null = null;
  nuevoBoost: string = '';
  nuevaImagen: string = '';
  nuevoDescripcion: string = '';
  nuevoStock: number | null = 10;

  // Variables para el Modal de Edición
  editando: boolean = false;
  kitEditandoId: number | null = null;
  editNombre: string = '';
  editMarca: string = '';
  editCategoria: string = '';
  editPrecio: number | null = null;
  editStock: number | null = null;
  editImagen: string = '';
  editDescripcion: string = '';

  // Variables para la confirmación de eliminación
  mostrandoConfirmacion: boolean = false;
  kitAEliminarId: number | null = null;

  notifTitulo: string = '';
  notifMensaje: string = '';
  notifHora: string = '';

  constructor(
    public state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarInventarioReal();
    this.cargarNotificacionesReales(); 
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

  crearProducto() {
    if (!this.nuevoNombre || !this.nuevaMarca || !this.nuevaCategoria || !this.nuevoPrecio || !this.nuevoBoost) {
      alert('Por favor completa los campos obligatorios, incluyendo la categoría.');
      return;
    }

    const nuevoKit = {
      name: this.nuevoNombre,
      marca: this.nuevaMarca,
      category: this.nuevaCategoria, 
      price: Number(this.nuevoPrecio),
      presionBoost: this.nuevoBoost,
      description: this.nuevoDescripcion || 'Kit de inducción forzada de alta competición',
      imageUrl: this.nuevaImagen || 'assets/img/supercargador-default.jpg',
      stock: Number(this.nuevoStock) || 10
    };

    this.voltexApi.crearProducto(nuevoKit).subscribe({
      next: async () => {
        this.cargarInventarioReal();
        this.state.lanzarNotificacion(
          '¡NUEVO KIT DISPONIBLE!',
          `Se ha inyectado el modelo ${nuevoKit.name} al stock.`,
          'push'
        );

        // Disparo seguro (si no usas Capacitor nativo, no afectará en web)
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

        // Limpiamos los campos del formulario
        this.nuevoNombre = '';
        this.nuevaMarca = '';
        this.nuevaCategoria = ''; 
        this.nuevoPrecio = null;
        this.nuevoBoost = '';
        this.nuevaImagen = '';
        this.nuevoDescripcion = '';
        this.nuevoStock = 10;
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
    this.editCategoria = prod.category || 'karting';
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

  confirmarEliminacion(id: number) {
    this.kitAEliminarId = id;
    this.mostrandoConfirmacion = true;
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

  cargarNotificacionesReales() {
    (this.voltexApi.getNotificaciones() as any).subscribe({
      next: (notifsBD: any) => {
        this.state.notificaciones.set(notifsBD);
      },
      error: (err: any) => console.error('Error al cargar notificaciones de MySQL:', err)
    });
  }

  enviarAlertaPush() {
    if (!this.notifTitulo || !this.notifMensaje || !this.notifHora) return;

    const nuevaAlerta = {
      titulo: this.notifTitulo,
      mensaje: this.notifMensaje,
      horaProgramada: this.notifHora,
      tipo: 'push'
    };

    (this.voltexApi.enviarNotificacion(nuevaAlerta) as any).subscribe({
      next: async () => {
        this.cargarNotificacionesReales(); 
        this.state.lanzarNotificacion(this.notifTitulo, this.notifMensaje, 'push', this.notifHora);

        try {
          // @ts-ignore
          if (typeof LocalNotifications !== 'undefined') {
            // @ts-ignore
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: this.notifTitulo,
                  body: this.notifMensaje,
                  id: new Date().getTime()
                }
              ]
            });
          }
        } catch (e) {
          console.log('Notificación nativa no disponible en web', e);
        }

        this.notifTitulo = '';
        this.notifMensaje = '';
        this.notifHora = '';
      },
      error: (err: any) => console.error('Error al guardar notificación:', err)
    });
  }

  cerrarSesion() {
    this.state.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }
}