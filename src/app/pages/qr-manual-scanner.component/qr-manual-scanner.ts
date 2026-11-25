import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as jsQRModule from 'jsqr';
import { VoltexApiService } from '../../services/voltex-api.service'; // Ajusta la ruta si difiere

interface ManualProducto {
  productoId: string | number;
  productoNombre: string;
  codigo: string;
  version: string;
  resumen: string;
  manualUrl?: string;
  fileName?: string | null;
  pasos: string[];
}

@Component({
  selector: 'app-qr-manual-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './qr-manual-scanner.html',
  styleUrl: './qr-manual-scanner.css'
})
export class QrManualScannerComponent implements OnInit, OnDestroy {
  @ViewChild('qrVideo') qrVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  facingMode: 'environment' | 'user' = 'environment';
  camaraActiva = false;
  codigoIngresado = '';

  estadoMensaje = '';
  estadoTipo: 'info' | 'success' | 'error' = 'info';
  manualActual: ManualProducto | null = null;

  private mediaStream: MediaStream | null = null;
  private scanTimer: number | null = null;
  private productosCache: any[] = [];

  constructor(
    private voltexApi: VoltexApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Cargamos productos para poder resolver SKU o nombre a su productId si el QR no trae el ID directo
    this.voltexApi.getProductos().subscribe({
      next: (res: any) => {
        this.productosCache = Array.isArray(res) ? res : res?.data || [];
      },
      error: () => {
        // Si falla, aún podemos consultar directo por ID numérico
      }
    });

    // Si entran por ruta /manual/:productId o /manual/:id
    const idParam =
      this.route.snapshot.paramMap.get('productId') ||
      this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.codigoIngresado = idParam;
      this.procesarCodigo(idParam, false);
    }
  }

  async iniciarCamaraQr(): Promise<void> {
    this.detenerCamaraQr();
    this.estadoTipo = 'info';
    this.estadoMensaje = `Solicitando permiso para la ${this.facingMode === 'environment' ? 'cámara trasera' : 'cámara frontal'}...`;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.estadoTipo = 'error';
      this.estadoMensaje = 'Este navegador no soporta acceso a la cámara. Puedes ingresar o simular el código QR abajo.';
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.facingMode } },
        audio: false
      });

      this.camaraActiva = true;
      this.estadoTipo = 'success';
      this.estadoMensaje = `Permiso concedido (${this.facingMode === 'environment' ? 'cámara trasera' : 'cámara frontal'}). Enfoca el código QR.`;

      setTimeout(() => {
        const video = this.qrVideo?.nativeElement;
        if (video && this.mediaStream) {
          video.srcObject = this.mediaStream;
          video.play().catch(() => {});
          this.iniciarDeteccion();
        }
      }, 80);
    } catch (error: any) {
      this.camaraActiva = false;
      this.estadoTipo = 'error';

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        this.estadoMensaje = 'Permiso de cámara denegado. Habilítalo en el navegador o introduce el código manualmente.';
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        this.estadoMensaje = 'No se encontró ninguna cámara disponible en este dispositivo.';
      } else {
        this.estadoMensaje = 'No se pudo abrir la cámara. Verifica los permisos o escribe el código del producto.';
      }
    }
  }

  detenerCamaraQr(): void {
    if (this.scanTimer !== null) {
      window.clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.qrVideo?.nativeElement) {
      this.qrVideo.nativeElement.srcObject = null;
    }
    this.camaraActiva = false;
  }

  private iniciarDeteccion(): void {
    const BarcodeDetectorApi = (window as any).BarcodeDetector;
    const detector = BarcodeDetectorApi ? new BarcodeDetectorApi({ formats: ['qr_code'] }) : null;
    const jsQR: any = (jsQRModule as any).default || jsQRModule;

    this.scanTimer = window.setInterval(async () => {
      const video = this.qrVideo?.nativeElement;
      const canvas = this.qrCanvas?.nativeElement;
      if (!video || video.readyState < 2 || !canvas) return;

      if (detector) {
        try {
          const codigos = await detector.detect(video);
          if (codigos && codigos.length > 0 && codigos[0].rawValue) {
            const valor = String(codigos[0].rawValue).trim();
            this.codigoIngresado = valor;
            this.procesarCodigo(valor, true);
            return;
          }
        } catch {
          // Continúa hacia fallback jsQR
        }
      }

      if (video.videoWidth && video.videoHeight && typeof jsQR === 'function') {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const resultadoQr = jsQR(imageData.data, imageData.width, imageData.height);
          if (resultadoQr?.data) {
            const valor = String(resultadoQr.data).trim();
            this.codigoIngresado = valor;
            this.procesarCodigo(valor, true);
          }
        }
      }
    }, 400);
  }

  private resolverProductId(rawValue: string): number | null {
    const limpio = rawValue.trim();

    // Si el QR contiene una URL con /manual/12 o ?productId=12
    const matchRuta = limpio.match(/\/manual\/(\d+)/i);
    if (matchRuta) {
      return Number(matchRuta[1]);
    }

    try {
      if (limpio.startsWith('http://') || limpio.startsWith('https://')) {
        const url = new URL(limpio);
        const qId = url.searchParams.get('productId') || url.searchParams.get('id');
        if (qId && /^\d+$/.test(qId)) {
          return Number(qId);
        }
      }
    } catch {
      // Ignora URL mal formada
    }

    // Si es un número directo (ej. "1" o "12")
    if (/^\d+$/.test(limpio)) {
      return Number(limpio);
    }

    // Si es SKU o nombre del producto, buscamos su id en productosCache
    const term = limpio.toLowerCase();
    const prod = this.productosCache.find((item: any) => {
      const matchSku = String(item?.sku ?? '').toLowerCase() === term;
      const matchNombre = String(item?.name ?? item?.nombre ?? '').toLowerCase() === term;
      return matchSku || matchNombre;
    });

    return prod?.id ? Number(prod.id) : null;
  }

  procesarCodigo(rawValue: string, desdeCamara = false): void {
    const limpio = (rawValue || '').trim();
    if (!limpio) {
      this.estadoTipo = 'error';
      this.estadoMensaje = 'No se detectó ningún código QR válido. Intenta enfocar de nuevo o escribe el código.';
      this.manualActual = null;
      return;
    }

    const productId = this.resolverProductId(limpio);
    if (!productId) {
      this.estadoTipo = 'error';
      this.estadoMensaje = `No se pudo identificar un ID de producto válido para "${limpio}".`;
      this.manualActual = null;
      return;
    }

    const apiAny = this.voltexApi as any;
    if (!apiAny.getManualPorProducto) {
      this.estadoTipo = 'error';
      this.estadoMensaje = 'Falta el método getManualPorProducto en VoltexApiService.';
      return;
    }

    this.estadoTipo = 'info';
    this.estadoMensaje = `Consultando manual del producto #${productId}...`;

    apiAny.getManualPorProducto(productId).subscribe({
      next: (manualBD: any) => {
        if (desdeCamara) {
          this.detenerCamaraQr();
        }

        const prod = manualBD?.product || this.productosCache.find((p: any) => p.id === productId);
        const nombreProd = prod?.name || prod?.nombre || `Producto #${productId}`;
        const skuProd = prod?.sku || `ID-${productId}`;

        this.manualActual = {
          productoId: manualBD?.productId ?? productId,
          productoNombre: nombreProd,
          codigo: String(skuProd).toUpperCase(),
          version: manualBD?.title || 'Manual Técnico Oficial',
          resumen:
            manualBD?.notes ||
            prod?.notas_instalacion ||
            prod?.description ||
            `Guía técnica y de uso para ${nombreProd}.`,
          manualUrl: manualBD?.manualUrl || '',
          fileName: manualBD?.fileName || null,
          pasos: [
            'Verifica que el vehículo esté apagado y la batería desconectada antes de intervenir.',
            'Revisa el manual vinculado y respeta los torques, conexiones y especificaciones del kit.',
            'Realiza una inspección visual y de pruebas iniciales antes de la operación normal.'
          ]
        };

        this.estadoTipo = 'success';
        this.estadoMensaje = `QR leído correctamente. Manual encontrado para "${nombreProd}".`;
      },
      error: (err: any) => {
        this.manualActual = null;
        this.estadoTipo = 'error';
        this.estadoMensaje =
          err?.status === 404
            ? `No hay un manual registrado en la base de datos para el producto #${productId}.`
            : `Error al consultar el manual del producto #${productId}.`;
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerCamaraQr();
  }
}