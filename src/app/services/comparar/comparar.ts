import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComparadorService } from './comparar.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';


@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './comparar.html',
  styleUrls: ['./comparar.css']
})
export class CompararComponent implements OnInit {
  productosParaComparar: any[] = [];
  idsSeleccionados: number[] = [];

  constructor(private comparadorService: ComparadorService, private http: HttpClient) {}

  ngOnInit(): void {
    this.comparadorService.ids$.subscribe(ids => {
      this.idsSeleccionados = ids;
      if (ids && ids.length > 0) {
        this.cargarDatosComparacion(ids);
      } else {
        this.productosParaComparar = [];
      }
    });
  }

  cargarDatosComparacion(ids: number[]): void {
    const idsString = ids.join(',');
    // Petición directa al endpoint de tu backend en NestJS
    this.http.get(`${environment.apiUrl}/productos/comparar/lista?ids=${idsString}`)
      .subscribe({
        next: (data: any) => {
          // Aseguramos que la respuesta se extraiga correctamente como arreglo
          if (Array.isArray(data)) {
            this.productosParaComparar = data;
          } else if (data && Array.isArray(data.productos)) {
            this.productosParaComparar = data.productos;
          } else if (data && Array.isArray(data.data)) {
            this.productosParaComparar = data.data;
          } else {
            this.productosParaComparar = [];
          }
        },
        error: (err) => {
          console.error('Error al cargar comparación desde el backend', err);
          this.productosParaComparar = [];
        }
      });
  }

  eliminarDeLista(id: number): void {
    this.comparadorService.removerId(id);
  }
}