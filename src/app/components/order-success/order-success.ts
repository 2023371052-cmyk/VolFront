import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterUsuario } from "../footer-usuario/footer-usuario";

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterUsuario],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css'
})
export class OrderSuccessComponent {}