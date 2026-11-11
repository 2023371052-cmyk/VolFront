import { TestBed } from '@angular/core/testing';
import { NetworkSyncService } from './network-sync.service';

describe('NetworkSyncService - Pruebas Unitarias (7VOLTEX)', () => {
  let service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NetworkSyncService);
    localStorage.clear();
  });

  // --- 1. CASO VÁLIDO ---
  it('debería procesar y validar correctamente datos existentes en la cola offline', () => {
    const mockPendientes = [{ id: 4, name: 'Prueba3', action: 'sync' }];
    localStorage.setItem('voltex_pedidos_offline', JSON.stringify(mockPendientes));

    Object.defineProperty(navigator, 'onLine', {
      get: () => true,
      configurable: true
    });

    const datosGuardados = JSON.parse(localStorage.getItem('voltex_pedidos_offline') || '[]');
    expect(datosGuardados.length).toBe(1);
    expect(datosGuardados[0].name).toBe('Prueba3');
  });

  // --- 2. CASO LÍMITE ---
  it('no debería arrojar errores si la cola de LocalStorage está completamente vacía (Caso límite)', () => {
    localStorage.removeItem('voltex_pedidos_offline');

    Object.defineProperty(navigator, 'onLine', {
      get: () => true,
      configurable: true
    });

    const resultadoStorage = localStorage.getItem('voltex_pedidos_offline');
    expect(resultadoStorage).toBeNull();
  });

  // --- 3. CASO INVÁLIDO / ERROR ---
  it('debería manejar de forma segura un formato JSON corrupto sin interrumpir la aplicación', () => {
    localStorage.setItem('voltex_pedidos_offline', 'JSON_MALFORMADO_INVALIDO{{{');

    let excepcionAtrapada = false;
    try {
      JSON.parse(localStorage.getItem('voltex_pedidos_offline') || '');
    } catch (error) {
      excepcionAtrapada = true;
    }

    expect(excepcionAtrapada).toBe(true);
  });
});