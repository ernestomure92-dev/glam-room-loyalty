// ============================================
// GLAM ROOM - APP.JS COMPLETO CON MEJORAS
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithPhoneNumber, 
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// CONFIGURACIÓN FIREBASE
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDYZk3kQj5U7MTgO7kXb6n8kL8k5k5k5k5",
  authDomain: "glam-room-loyalty.firebaseapp.com",
  projectId: "glam-room-loyalty",
  storageBucket: "glam-room-loyalty.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// VARIABLES GLOBALES
// ============================================
let confirmationResult = null;
let recaptchaVerifier = null;
let currentUser = null;

// ============================================
// SISTEMA DE NOTIFICACIONES (TOAST)
// ============================================
class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
      
      // Estilos CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        .toast {
          background: white;
          color: #333;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 300px;
          pointer-events: all;
          animation: slideIn 0.3s ease;
        }
        .toast-success { border-left: 4px solid #4CAF50; }
        .toast-error { border-left: 4px solid #f44336; }
        .toast-warning { border-left: 4px solid #ff9800; }
        .toast-info { border-left: 4px solid #2196F3; }
      `;
      document.head.appendChild(style);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const titles = { success: '¡Éxito!', error: 'Error', warning: 'Advertencia', info: 'Información' };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-size: 20px;">${icons[type]}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 2px; color: #333;">${titles[type]}</div>
        <div style="font-size: 14px; color: #666;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 20px; color: #999; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(message, duration) { this.show(message, 'success', duration); }
  error(message, duration) { this.show(message, 'error', duration); }
  warning(message, duration) { this.show(message, 'warning', duration); }
  info(message, duration) { this.show(message, 'info', duration); }
}

const notify = new NotificationSystem();

// ============================================
// LOADER GLOBAL
// ============================================
function mostrarLoader(mensaje = 'Cargando...') {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 60px; height: 60px; border: 4px solid #ff6b9d; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="margin-top: 1rem; color: #c44569; font-weight: 500; font-family: inherit;">${mensaje}</p>
      </div>
    `;
    loader.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255, 255, 255, 0.95); display: flex;
      justify-content: center; align-items: center; z-index: 9999;
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    document.body.appendChild(loader);
  } else {
    loader.querySelector('p').textContent = mensaje;
    loader.style.display = 'flex';
  }
}

function ocultarLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.style.display = 'none';
}

// ============================================
// VALIDACIONES
// ============================================
function validarTelefonoMexico(telefono) {
  if (!telefono || typeof telefono !== 'string') {
    return { valido: false, error: 'Ingresa un número de teléfono' };
  }

  const numeros = telefono.replace(/\D/g, '');
  
  if (numeros.length === 0) return { valido: false, error: 'Ingresa un número de teléfono' };
  if (numeros.length < 10) return { valido: false, error: 'El número debe tener al menos 10 dígitos' };
  if (numeros.length > 13) return { valido: false, error: 'El número es demasiado largo' };

  const diezDigitos = numeros.slice(-10);
  const primerDigito = parseInt(diezDigitos[0]);
  
  if (primerDigito < 1 || primerDigito > 9) {
    return { valido: false, error: 'Número de teléfono no válido para México' };
  }

  const formateado = `${diezDigitos.slice(0, 2)} ${diezDigitos.slice(2, 6)} ${diezDigitos.slice(6)}`;
  const internacional = `+52${diezDigitos}`;

  return { valido: true, formateado, internacional, basico: diezDigitos };
}

function validarNombre(nombre) {
  if (!nombre || nombre.trim().length < 2) {
    return { valido: false, error: 'Nombre muy corto (mínimo 2 caracteres)' };
  }
  
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!regex.test(nombre)) {
    return { valido: false, error: 'El nombre solo puede contener letras' };
  }
  
  return { valido: true, valor: nombre.trim() };
}

function sanitizarInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim();
}

// ============================================
// MANEJO DE ERRORES FIREBASE
// ============================================
function manejarErrorFirebase(error) {
  console.error('Error Firebase:', error);
  
  const mensajes = {
    'auth/invalid-phone-number': 'El número de teléfono no tiene un formato válido',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo',
    'auth/invalid-verification-code': 'El código de verificación es incorrecto',
    'auth/code-expired': 'El código ha expirado. Solicita uno nuevo',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'permission-denied': 'No tienes permisos para realizar esta acción',
    'not-found': 'El recurso solicitado no existe',
    'already-exists': 'Este registro ya existe',
    'resource-exhausted': 'Límite de operaciones alcanzado. Intenta más tarde',
    'network-request-failed': 'Error de conexión. Verifica tu internet',
    'unauthenticated': 'Debes iniciar sesión para continuar'
  };

  for (const [code, message] of Object.entries(mensajes)) {
    if (error.code?.includes(code) || error.message?.includes(code)) {
      return message;
    }
  }
  return error.message || 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
}

// ============================================
// INICIALIZACIÓN DE RECAPTCHA
// ============================================
function inicializarRecaptcha() {
  if (recaptchaVerifier) return;
  
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible',
    'callback': (response) => {
      console.log('Recaptcha verificado');
    },
    'expired-callback': () => {
      notify.warning('El recaptcha expiró. Intenta de nuevo.');
      recaptchaVerifier = null;
    }
  });
}

// ============================================
// CREAR O ACTUALIZAR USUARIO EN FIRESTORE
// ============================================
async function crearOActualizarUsuario(userId, telefono, nombre = null) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    const datosUsuario = {
      telefono: telefono,
      ultimoAcceso: serverTimestamp(),
      visitas: 0,
      nivel: 'bronce',
      recompensaDisponible: false,
      updatedAt: serverTimestamp()
    };

    if (nombre) {
      datosUsuario.nombre = sanitizarInput(nombre);
    }

    if (!userSnap.exists()) {
      // NUEVO USUARIO
      datosUsuario.creado = serverTimestamp();
      datosUsuario.visitas = 0;
      datosUsuario.historialVisitas = [];
      
      await setDoc(userRef, datosUsuario);
      console.log('Nuevo usuario creado:', userId);
      return { esNuevo: true, datos: datosUsuario };
    } else {
      // USUARIO EXISTENTE - Actualizar último acceso
      const datosExistentes = userSnap.data();
      await updateDoc(userRef, {
        ultimoAcceso: serverTimestamp(),
        telefono: telefono // Actualizar por si cambió
      });
      return { esNuevo: false, datos: datosExistentes };
    }
  } catch (error) {
    console.error('Error al crear/actualizar usuario:', error);
    throw error;
  }
}

// ============================================
// ENVIAR CÓDIGO SMS
// ============================================
async function enviarCodigo() {
  const telefonoInput = document.getElementById('telefono');
  const nombreInput = document.getElementById('nombre');
  
  if (!telefonoInput) return;
  
  const telefono = telefonoInput.value.trim();
  
  // Validar teléfono
  const validacion = validarTelefonoMexico(telefono);
  if (!validacion.valido) {
    notify.error(validacion.error);
    telefonoInput.focus();
    return;
  }
  
  // Validar nombre si está visible (para nuevos usuarios)
  let nombreValidado = null;
  const nombreContainer = document.getElementById('nombre-container');
  if (nombreContainer && !nombreContainer.classList.contains('hidden')) {
    const nombre = nombreInput?.value || '';
    const valNombre = validarNombre(nombre);
    if (!valNombre.valido) {
      notify.error(valNombre.error);
      nombreInput.focus();
      return;
    }
    nombreValidado = valNombre.valor;
    // Guardar en sessionStorage temporalmente
    sessionStorage.setItem('tempNombre', nombreValidado);
  }

  mostrarLoader('Enviando código SMS...');
  
  try {
    inicializarRecaptcha();
    
    confirmationResult = await signInWithPhoneNumber(auth, validacion.internacional, recaptchaVerifier);
    
    // Guardar teléfono formateado para mostrar
    sessionStorage.setItem('tempTelefono', validacion.formateado);
    
    // Mostrar sección de código
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('codigo-section')?.classList.remove('hidden');
    document.getElementById('telefono-mostrar').textContent = validacion.formateado;
    
    notify.success(`Código enviado a ${validacion.formateado}`);
    
    // Enfocar input de código
    setTimeout(() => document.getElementById('codigo')?.focus(), 100);
    
  } catch (error) {
    const mensaje = manejarErrorFirebase(error);
    notify.error(mensaje);
    recaptchaVerifier = null; // Reset para reintentar
  } finally {
    ocultarLoader();
  }
}

// ============================================
// VERIFICAR CÓDIGO SMS
// ============================================
async function verificarCodigo() {
  const codigoInput = document.getElementById('codigo');
  const codigo = codigoInput?.value.trim();
  
  if (!codigo || codigo.length !== 6) {
    notify.error('Ingresa el código de 6 dígitos');
    return;
  }

  mostrarLoader('Verificando código...');
  
  try {
    const result = await confirmationResult.confirm(codigo);
    const user = result.user;
    
    // Recuperar datos temporales
    const nombre = sessionStorage.getItem('tempNombre');
    const telefono = sessionStorage.getItem('tempTelefono');
    
    // Crear o actualizar usuario en Firestore
    const resultado = await crearOActualizarUsuario(user.uid, telefono, nombre);
    
    if (resultado.esNuevo) {
      notify.success('¡Bienvenida a Glam Room! Tu cuenta ha sido creada');
    } else {
      notify.success(`¡Bienvenida de vuelta!`);
    }
    
    // Limpiar temporales
    sessionStorage.removeItem('tempNombre');
    sessionStorage.removeItem('tempTelefono');
    
    // Cargar dashboard
    mostrarDashboard(user.uid);
    
  } catch (error) {
    const mensaje = manejarErrorFirebase(error);
    notify.error(mensaje);
    codigoInput.value = '';
    codigoInput.focus();
  } finally {
    ocultarLoader();
  }
}

// ============================================
// VERIFICAR SI EL TELÉFONO YA EXISTE
// ============================================
async function verificarTelefonoExistente() {
  const telefonoInput = document.getElementById('telefono');
  const telefono = telefonoInput?.value.trim();
  
  if (!telefono) return;
  
  const validacion = validarTelefonoMexico(telefono);
  if (!validacion.valido) return;
  
  try {
    // Buscar usuario por teléfono
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('telefono', 'in', [
      validacion.internacional,
      validacion.basico,
      telefono
    ]));
    
    const snapshot = await getDocs(q);
    const nombreContainer = document.getElementById('nombre-container');
    
    if (snapshot.empty) {
      // ES NUEVO - Mostrar campo de nombre
      if (nombreContainer) {
        nombreContainer.classList.remove('hidden');
        document.getElementById('nombre')?.focus();
      }
      notify.info('Parece que eres nueva. Por favor ingresa tu nombre');
    } else {
      // YA EXISTE - Ocultar nombre
      if (nombreContainer) {
        nombreContainer.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error verificando teléfono:', error);
  }
}

// ============================================
// MOSTRAR DASHBOARD DE USUARIO
// ============================================
async function mostrarDashboard(userId) {
  mostrarLoader('Cargando tu tarjeta...');
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      notify.error('Error al cargar datos de usuario');
      return;
    }
    
    const datos = userSnap.data();
    currentUser = { id: userId, ...datos };
    
    // Ocultar login, mostrar dashboard
    document.getElementById('login-container')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.remove('hidden');
    
    // Actualizar UI
    actualizarTarjetaLealtad(datos);
    cargarHistorial(userId);
    
  } catch (error) {
    notify.error('Error al cargar tu información');
    console.error(error);
  } finally {
    ocultarLoader();
  }
}

// ============================================
// ACTUALIZAR TARJETA DE LEALTAD
// ============================================
function actualizarTarjetaLealtad(datos) {
  // Nombre
  const nombreEl = document.getElementById('user-name');
  if (nombreEl) {
    nombreEl.textContent = datos.nombre || 'Cliente Glam';
  }
  
  // Nivel
  const nivelEl = document.getElementById('user-level');
  if (nivelEl) {
    nivelEl.textContent = datos.nivel?.toUpperCase() || 'BRONCE';
    nivelEl.className = `level-badge level-${datos.nivel || 'bronce'}`;
  }
  
  // Visitas
  const visitasEl = document.getElementById('visit-count');
  if (visitasEl) {
    visitasEl.textContent = `${datos.visitas || 0} / 10`;
  }
  
  // Estrellas
  const starsContainer = document.getElementById('stars-container');
  if (starsContainer) {
    starsContainer.innerHTML = '';
    const visitas = datos.visitas || 0;
    
    for (let i = 1; i <= 10; i++) {
      const star = document.createElement('span');
      star.className = `star ${i <= visitas ? 'active' : ''}`;
      star.innerHTML = '⭐';
      star.title = `Visita ${i}`;
      starsContainer.appendChild(star);
    }
  }
  
  // Recompensa disponible
  const recompensaEl = document.getElementById('recompensa-banner');
  if (recompensaEl) {
    if (datos.recompensaDisponible) {
      recompensaEl.classList.remove('hidden');
      recompensaEl.innerHTML = `
        <div class="recompensa-content">
          <h3>🎉 ¡Felicidades! 🎉</h3>
          <p>Tienes una recompensa disponible</p>
          <button onclick="canjearRecompensa()" class="btn-recompensa">
            Canjear Ahora
          </button>
        </div>
      `;
    } else {
      recompensaEl.classList.add('hidden');
    }
  }
  
  // Progreso al siguiente nivel
  const progresoEl = document.getElementById('level-progress');
  if (progresoEl) {
    const niveles = { bronce: 0, plata: 10, oro: 25, diamante: 50 };
    const siguiente = datos.nivel === 'bronce' ? 10 : datos.nivel === 'plata' ? 25 : 50;
    const progreso = Math.min((datos.visitas / siguiente) * 100, 100);
    progresoEl.style.width = `${progreso}%`;
  }
}

// ============================================
// CARGAR HISTORIAL DE VISITAS
// ============================================
async function cargarHistorial(userId) {
  try {
    const historialRef = collection(db, 'users', userId, 'historial');
    const q = query(historialRef, where('tipo', '==', 'visita'));
    const snapshot = await getDocs(q);
    
    const lista = document.getElementById('historial-list');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    if (snapshot.empty) {
      lista.innerHTML = '<p class="empty-state">Aún no tienes visitas registradas</p>';
      return;
    }
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.className = 'historial-item';
      item.innerHTML = `
        <div class="historial-fecha">${formatearFecha(data.fecha?.toDate())}</div>
        <div class="historial-servicio">${data.servicio || 'Visita'}</div>
        <div class="historial-puntos">+1 ⭐</div>
      `;
      lista.appendChild(item);
    });
    
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}

// ============================================
// CANJEAR RECOMPENSA
// ============================================
async function canjearRecompensa() {
  if (!currentUser) return;
  
  if (!confirm('¿Deseas canjear tu recompensa ahora?')) return;
  
  mostrarLoader('Procesando canje...');
  
  try {
    const userRef = doc(db, 'users', currentUser.id);
    
    await updateDoc(userRef, {
      recompensaDisponible: false,
      ultimoCanje: serverTimestamp(),
      visitas: 0, // Resetear o mantener según tu lógica
      updatedAt: serverTimestamp()
    });
    
    // Registrar en historial
    await addDoc(collection(db, 'users', currentUser.id, 'historial'), {
      tipo: 'canje',
      fecha: serverTimestamp(),
      descripcion: 'Recompensa canjeada',
      premio: 'Servicio gratuito'
    });
    
    notify.success('¡Recompensa canjeada exitosamente!');
    mostrarDashboard(currentUser.id); // Recargar
    
  } catch (error) {
    notify.error('Error al canjear recompensa');
    console.error(error);
  } finally {
    ocultarLoader();
  }
}

// ============================================
// CERRAR SESIÓN
// ============================================
async function cerrarSesion() {
  try {
    await signOut(auth);
    currentUser = null;
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('login-container')?.classList.remove('hidden');
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('codigo-section')?.classList.add('hidden');
    document.getElementById('telefono').value = '';
    document.getElementById('codigo').value = '';
    notify.success('Sesión cerrada correctamente');
  } catch (error) {
    notify.error('Error al cerrar sesión');
  }
}

// ============================================
// UTILIDADES
// ============================================
function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-MX', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya hay sesión activa
  onAuthStateChanged(auth, (user) => {
    if (user) {
      mostrarDashboard(user.uid);
    }
  });
  
  // Botón enviar código
  document.getElementById('btn-enviar-codigo')?.addEventListener('click', enviarCodigo);
  
  // Botón verificar código
  document.getElementById('btn-verificar')?.addEventListener('click', verificarCodigo);
  
  // Input teléfono - verificar existencia al perder foco
  document.getElementById('telefono')?.addEventListener('blur', verificarTelefonoExistente);
  
  // Input código - verificar automático al completar 6 dígitos
  document.getElementById('codigo')?.addEventListener('input', (e) => {
    if (e.target.value.length === 6) {
      verificarCodigo();
    }
  });
  
  // Cerrar sesión
  document.getElementById('btn-logout')?.addEventListener('click', cerrarSesion);
  
  // Botón canjear recompensa (global)
  window.canjearRecompensa = canjearRecompensa;
});

// ============================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.appFunctions = {
  enviarCodigo,
  verificarCodigo,
  cerrarSesion,
  canjearRecompensa
};
