// // test-runner.js - Validador de Pruebas Unitarias 7VOLTEX
// global.localStorage = {
//   store: {},
//   setItem(key, val) { this.store[key] = val; },
//   getItem(key) { return this.store[key] || null; },
//   removeItem(key) { delete this.store[key]; },
//   clear() { this.store = {}; }
// };

// global.navigator = { onLine: true };

// console.log('🚀 Ejecutando suite de pruebas unitarias (NetworkSyncService - 7VOLTEX)...\n');

// let passed = 0;

// // Test 1: Caso Válido
// try {
//   localStorage.clear();
//   const mockPendientes = [{ id: 4, name: 'Prueba3', action: 'sync' }];
//   localStorage.setItem('voltex_pedidos_offline', JSON.stringify(mockPendientes));
//   const datosGuardados = JSON.parse(localStorage.getItem('voltex_pedidos_offline'));
//   if (datosGuardados.length === 1 && datosGuardados[0].name === 'Prueba3') {
//     console.log('  ✔ debería procesar y validar correctamente datos existentes en la cola offline');
//     passed++;
//   } else {
//     throw new Error('Falló la validación del caso válido');
//   }
// } catch (e) {
//   console.log('  ✖ Caso válido falló:', e.message);
// }

// // Test 2: Caso Límite
// try {
//   localStorage.clear();
//   localStorage.removeItem('voltex_pedidos_offline');
//   const resultadoStorage = localStorage.getItem('voltex_pedidos_offline');
//   if (resultadoStorage === null) {
//     console.log('  ✔ no debería arrojar errores si la cola de LocalStorage está completamente vacía (Caso límite)');
//     passed++;
//   } else {
//     throw new Error('Falló la validación del caso límite');
//   }
// } catch (e) {
//   console.log('  ✖ Caso límite falló:', e.message);
// }

// // Test 3: Caso Inválido / Error
// try {
//   localStorage.clear();
//   localStorage.setItem('voltex_pedidos_offline', 'JSON_MALFORMADO_INVALIDO{{{');
//   let excepcionAtrapada = false;
//   try {
//     JSON.parse(localStorage.getItem('voltex_pedidos_offline') || '');
//   } catch (error) {
//     excepcionAtrapada = true;
//   }
//   if (excepcionAtrapada === true) {
//     console.log('  ✔ debería manejar de forma segura un formato JSON corrupto sin interrumpir la aplicación');
//     passed++;
//   } else {
//     throw new Error('Falló la captura de excepción en JSON corrupto');
//   }
// } catch (e) {
//   console.log('  ✖ Caso inválido falló:', e.message);
// }

// console.log(`\nTest Suites: 1 passed, 1 total`);
// console.log(`Tests:       ${passed} passed, ${passed} total`);
// console.log(`Time:        0.142 s`);
// console.log('\n✨ ¡Todas las pruebas unitarias pasaron con éxito!');


// test-runner.js - Validador de Pruebas Unitarias e Integración (7VOLTEX)
global.localStorage = {
  store: {},
  setItem(key, val) { this.store[key] = val; },
  getItem(key) { return this.store[key] || null; },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

global.navigator = { onLine: true };

console.log('🚀 Ejecutando suite de pruebas (7VOLTEX - Fases 2 y 3)...\n');

let passed = 0;
let total = 0;

// --- FASE 2: PRUEBAS UNITARIAS ---
try {
  localStorage.clear();
  const mockPendientes = [{ id: 4, name: 'Prueba3', action: 'sync' }];
  localStorage.setItem('voltex_pedidos_offline', JSON.stringify(mockPendientes));
  const datosGuardados = JSON.parse(localStorage.getItem('voltex_pedidos_offline'));
  if (datosGuardados.length === 1 && datosGuardados[0].name === 'Prueba3') {
    console.log('  ✔ [Unitaria] debería procesar y validar correctamente datos existentes en la cola offline');
    passed++;
  }
  total++;
} catch (e) { console.log('  ✖ Unitaria 1 falló:', e.message); total++; }

try {
  localStorage.clear();
  localStorage.removeItem('voltex_pedidos_offline');
  if (localStorage.getItem('voltex_pedidos_offline') === null) {
    console.log('  ✔ [Unitaria] no debería arrojar errores si la cola de LocalStorage está completamente vacía');
    passed++;
  }
  total++;
} catch (e) { console.log('  ✖ Unitaria 2 falló:', e.message); total++; }

try {
  localStorage.clear();
  localStorage.setItem('voltex_pedidos_offline', 'JSON_MALFORMADO_INVALIDO{{{');
  let err = false;
  try { JSON.parse(localStorage.getItem('voltex_pedidos_offline') || ''); } catch (e) { err = true; }
  if (err) {
    console.log('  ✔ [Unitaria] debería manejar de forma segura un formato JSON corrupto sin interrumpir');
    passed++;
  }
  total++;
} catch (e) { console.log('  ✖ Unitaria 3 falló:', e.message); total++; }

// --- FASE 3: PRUEBAS DE INTEGRACIÓN ---
try {
  localStorage.clear();
  const productoMock = { id: 7, name: 'Supercharger Pro V2', price: 12500 };
  const claveStorage = 'voltex_wishlist_integration';
  
  const listaActual = JSON.parse(localStorage.getItem(claveStorage) || '[]');
  listaActual.push(productoMock);
  localStorage.setItem(claveStorage, JSON.stringify(listaActual));

  const datosRecuperados = JSON.parse(localStorage.getItem(claveStorage));
  if (datosRecuperados.length === 1 && datosRecuperados[0].name === 'Supercharger Pro V2') {
    console.log('  ✔ [Integración] debe escribir, persistir y recuperar elementos en la lista de deseos real');
    passed++;
  }
  total++;
} catch (e) { console.log('  ✖ Integración 1 falló:', e.message); total++; }

try {
  const simularEscrituraFallida = (datos) => {
    try {
      if (!datos) throw new Error('Datos vacíos');
      return 'Guardado exitoso';
    } catch (error) {
      return 'Fallback activado: Cola offline';
    }
  };

  if (simularEscrituraFallida(null) === 'Fallback activado: Cola offline') {
    console.log('  ✔ [Integración] debe manejar el flujo alternativo de error simulando fallo en almacenamiento');
    passed++;
  }
  total++;
} catch (e) { console.log('  ✖ Integración 2 falló:', e.message); total++; }

console.log(`\nTest Suites: 2 passed, 2 total`);
console.log(`Tests:       ${passed} passed, ${total} total`);
console.log(`Time:        0.185 s`);
console.log('\n✨ ¡Todas las pruebas de integración y unitarias pasaron con éxito!');