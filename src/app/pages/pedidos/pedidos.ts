import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { VoltexStateService } from '../../services/voltex-state';
import { VoltexApiService } from '../../services/voltex-api.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class PedidosComponent implements OnInit {
  pedidos: any[] = [];
  usuarioEmail: string | null = null;
  cargando = true;
  pedidoParaImprimir: any = null;

  constructor(
    private state: VoltexStateService,
    private voltexApi: VoltexApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  private obtenerUsuarioActual(): any {
    const estadoGlobal: any = this.state;
    let user: any =
      typeof estadoGlobal?.usuarioActual === 'function'
        ? estadoGlobal.usuarioActual()
        : (estadoGlobal?.usuarioActual || estadoGlobal?.usuario || estadoGlobal?.currentUser || null);

    if (!user || (!user.id && !user.userId && !user.usuarioId && !user.sub)) {
      try {
        const keys = ['voltex_user', 'usuarioActual', 'usuario', 'user'];
        for (const key of keys) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.id || parsed.userId || parsed.usuarioId || parsed.sub || parsed.email)) {
              user = { ...(user || {}), ...parsed };
              break;
            }
          }
        }
      } catch {
        // Ignora errores de acceso a localStorage
      }
    }

    return user || {};
  }

  ngOnInit(): void {
    const user: any = this.obtenerUsuarioActual();

    const rawId =
      user?.id ??
      user?.userId ??
      user?.usuarioId ??
      user?.sub ??
      null;

    const numId = Number(rawId);
    const hasValidId =
      rawId !== null &&
      rawId !== undefined &&
      rawId !== '' &&
      !Number.isNaN(numId) &&
      numId > 0;

    if (!user || (!user.email && !hasValidId)) {
      alert('Debes iniciar sesión para consultar el historial de Pits.');
      this.router.navigate(['/login']);
      return;
    }

    this.usuarioEmail = user.email || null;

    if (hasValidId) {
      this.cargarHistorialPedidos(numId);
      return;
    }

    console.warn('⚠️ La sesión actual no tiene id numérico; revisa que al hacer login se guarde el id del usuario.');
    this.pedidos = [];
    this.cargando = false;
    this.cdr.detectChanges();
  }

  cargarHistorialPedidos(userId: number): void {
    this.cargando = true;

    this.voltexApi.getOrdenesPorUsuario(userId).subscribe({
      next: (data: any) => {
        console.log('📜 HISTORIAL DE ÓRDENES RECIBIDO:', data);
        this.pedidos = Array.isArray(data)
          ? data
          : (data?.ordenes || data?.orders || data?.data || []);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ Error al cargar historial de pedidos:', err);
        this.pedidos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Mantiene la fecha intacta y ajusta la hora a la zona local de México
  formatearFechaHora(fechaRaw: any): string {
    if (!fechaRaw) return '';

    let fechaStr = String(fechaRaw).trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(fechaStr)) {
      fechaStr = fechaStr.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(fechaStr)) {
      fechaStr = fechaStr + 'Z';
    }

    const dateObj = new Date(fechaStr);
    if (Number.isNaN(dateObj.getTime())) {
      return fechaStr;
    }

    return dateObj.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  // Abre una ventana limpia únicamente con el comprobante de la orden seleccionada
  descargarTicketPdf(pedido: any): void {
    const orderId = pedido?.id || pedido?._id || '—';
    const estatus = String(pedido?.estado || pedido?.status || 'COMPLETED').toUpperCase();
    const fechaFormateada = this.formatearFechaHora(
      pedido?.fecha || pedido?.createdAt || pedido?.created_at
    );
    const totalNumerico = Number(
      pedido?.total ?? pedido?.precioTotal ?? pedido?.totalAmount ?? pedido?.total_amount ?? 0
    );
    const totalFormateado = totalNumerico.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });

    const detalles: any[] =
      pedido?.orderDetails || pedido?.productos || pedido?.items || [];

    const filasItems = detalles
      .map((item: any) => {
        const nombre =
          item?.product?.name ||
          item?.product?.nombre ||
          item?.nombre ||
          item?.name ||
          `Componente #${item?.productId ?? ''}`;
        const cantidad = Number(item?.quantity ?? item?.cantidad ?? 1);
        const precioUnitario = Number(
          item?.unitPrice ?? item?.price ?? item?.product?.price ?? 0
        );
        const subtotalItem = (precioUnitario * cantidad).toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN'
        });

        return `
          <div class="item-row">
            <div class="item-info">
              <span class="item-name">${nombre}</span>
              <span class="item-qty">Cantidad: x${cantidad}</span>
            </div>
            <span class="item-price">${subtotalItem}</span>
          </div>
        `;
      })
      .join('');

    const ventanaTicket = window.open('', '_blank', 'width=460,height=700');
    if (!ventanaTicket) {
      window.print();
      return;
    }

    ventanaTicket.document.open();
    ventanaTicket.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Ticket Orden #${orderId} - 7VOLTEX</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
            display: flex;
            justify-content: center;
            padding: 24px 12px;
          }
          .ticket {
            width: 100%;
            max-width: 390px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-top: 6px solid #0b1d3a;
            border-radius: 14px;
            padding: 24px 20px;
            box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
          }
          .header {
            text-align: center;
            padding-bottom: 14px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .brand {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #0b1d3a;
          }
          .subtitle {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
          }
          .meta {
            margin: 16px 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 13px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .meta-label {
            color: #64748b;
          }
          .meta-value {
            font-weight: 700;
            color: #0f172a;
          }
          .badge {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #1e3a8a;
            margin-bottom: 10px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
          }
          .items {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-bottom: 14px;
            border-bottom: 1px dashed #cbd5e1;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            font-size: 13px;
          }
          .item-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .item-name {
            font-weight: 600;
            color: #0f172a;
          }
          .item-qty {
            font-size: 11.5px;
            color: #64748b;
          }
          .item-price {
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
          }
          .total-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 16px;
            padding: 12px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
          }
          .total-label {
            font-size: 13px;
            font-weight: 800;
            color: #0b1d3a;
          }
          .total-amount {
            font-size: 17px;
            font-weight: 900;
            color: #1e3a8a;
          }
          .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .ticket {
              box-shadow: none;
              border: 1px solid #cbd5e1;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="brand">7VOLTEX MOTORSPORT</div>
            <div class="subtitle">Historial y Comprobante de Orden en Pits</div>
          </div>

          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">Orden</span>
              <span class="meta-value">#${orderId}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Estatus</span>
              <span class="badge">${estatus}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Fecha y hora</span>
              <span class="meta-value">${fechaFormateada}</span>
            </div>
          </div>

          <div class="section-title">Componentes adquiridos</div>
          <div class="items">
            ${filasItems || '<div class="item-row"><span class="item-name">Sin componentes registrados</span></div>'}
          </div>

          <div class="total-box">
            <span class="total-label">TOTAL PAGADO</span>
            <span class="total-amount">${totalFormateado}</span>
          </div>

          <div class="footer">
            ¡Gracias por tu compra en 7VOLTEX!
          </div>
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
            }, 150);
          };
        </script>
      </body>
      </html>
    `);
    ventanaTicket.document.close();
  }
}