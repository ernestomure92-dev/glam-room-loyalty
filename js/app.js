// ============================================
// GLAM ROOM - APP.JS COMPATIBLE
// Funciona con estructura HTML existente
// ============================================

// Firebase ya debe estar cargado en el HTML globalmente
// Asegúrate de tener en tu HTML:
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

// ============================================
// CONFIGURACIÓN FIREBASE (usa la misma que tienes)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDYZk3kQj5U7MTgO7kXb6n8kL8k5k5k5k5",
  authDomain: "glam-room-loyalty.firebaseapp.com",
  projectId: "glam-room-loyalty",
  storageBucket: "glam-room-loyalty.appspot.com",
  messagingSenderId: "724288769963",
  appId: "1:724288769963:web:02e78c225c0ba8c3a20cee"
};

// Inicializar solo si no está inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// VARIABLES GLOBALES
// ============================================
let confirmationResult = null;
let recaptchaVerifier = null;
let currentUser = null;
let tempNombre = null;

// ============================================
// SISTEMA DE NOTIFICACIONES TOAST
// ============================================
const NotificationSystem = {
  container: null,
  
  init: function() {
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
      
      // CSS para animaciones
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
          font-family: inherit;
        }
        .toast-success { border-left: 4px solid #4CAF50; }
        .toast-error { border-left: 4px solid #f44336; }
        .toast-warning { border-left: 4px solid #ff9800; }
        .toast-info { border-left: 4px solid #2196F3; }
      `;
      document.head.appendChild(style);
    }
  },
  
  show: function(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const titles = { success: '¡Éxito!', error: 'Error', warning: 'Advertencia', info: 'Información' };
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = `
      <span style="font-size: 20px;">${icons[type]}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 2px; color: #333;">${titles[type]}</div>
        <div style="font-size: 14px; color: #666;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 20px; color: #999; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(function() {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(function() { toast.remove(); }, 300);
    }, duration);
  },
  
  success: function(msg, duration) { this.show(msg, 'success', duration); },
  error: function(msg, duration) { this.show(msg, 'error', duration); },
  warning: function(msg, duration) { this.show(msg, 'warning', duration); },
  info: function(msg, duration) { this.show(msg, 'info', duration); }
};

// Inicializar notificaciones
NotificationSystem.init();

// Alias global para compatibilidad
const notify = NotificationSystem;

// ============================================
// LOADER GLOBAL
// ============================================
function mostrarLoader(mensaje) {
  mensaje = mensaje || 'Cargando...';
  let loader = document.getElementById('global-loader');
  
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 60px; height: 60px; border: 4px solid #ff6b9d; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="margin-top: 1rem; color: #c44569; font-weight: 500;">${mensaje}</p>
      </div>
    `;
    loader.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255, 255, 255, 0.95); display: flex;
      justify-content: center; align-items: center; z-index: 9999;
    `;
    
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
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

  const formateado = diezDigitos.slice(0, 2) + ' ' + diezDigitos.slice(2, 6) + ' ' + diezDigitos.slice(6);
  const internacional = '+52' + diezDigitos;

  return { valido: true, formateado: formateado, internacional: internacional, basico: diezDigitos };
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

// ============================================
// MANEJO DE ERRORES
// ============================================
function manejarErrorFirebase(error) {
  console.error('Error Firebase:', error);
  
  const mensajes = {
    'auth/invalid-phone-number': 'El número de teléfono no tiene un formato válido',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos',
    'auth/invalid-verification-code': 'El código es incorrecto',
    'auth/code-expired': 'El código expiró. Solicita uno nuevo',
    'permission-denied': 'No tienes permisos para esta acción',
    'not-found': 'El recurso no existe',
    'network-request-failed': 'Error de conexión. Verifica tu internet'
  };

  for (let code in mensajes) {
    if (error.code && error.code.indexOf(code) !== -1) {
      return mensajes[code];
    }
  }
  return error.message || 'Ocurrió un error. Intenta de nuevo.';
}

// ============================================
// CREAR O ACTUALIZAR USUARIO (CORRECCIÓN PRINCIPAL)
// ============================================
async function crearOActualizarUsuario(userId, telefono, nombre) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    const datosUsuario = {
      telefono: telefono,
      ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (nombre) {
      datosUsuario.nombre = nombre;
    }

    if (!userSnap.exists) {
      // NUEVO USUARIO - Crear documento completo
      datosUsuario.creado = firebase.firestore.FieldValue.serverTimestamp();
      datosUsuario.visitas = 0;
      datosUsuario.nivel = 'bronce';
      datosUsuario.recompensaDisponible = false;
      datosUsuario.historialVisitas = [];
      
      await userRef.set(datosUsuario);
      console.log('Nuevo usuario creado:', userId);
      return { esNuevo: true, datos: datosUsuario };
    } else {
      // USUARIO EXISTENTE - Solo actualizar último acceso
      const datosExistentes = userSnap.data();
      await userRef.update({
        ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp(),
        telefono: telefono
      });
      return { esNuevo: false, datos: datosExistentes };
    }
  } catch (error) {
    console.error('Error al crear/actualizar usuario:', error);
    throw error;
  }
}

// ============================================
// VERIFICAR SI TELÉFONO YA EXISTE
// ============================================
async function verificarTelefonoExistente() {
  const telefonoInput = document.getElementById('telefono');
  const telefono = telefonoInput ? telefonoInput.value.trim() : '';
  
  if (!telefono) return;
  
  const validacion = validarTelefonoMexico(telefono);
  if (!validacion.valido) return;
  
  try {
    // Buscar por teléfono
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('telefono', '==', validacion.internacional).get();
    
    const nombreContainer = document.getElementById('nombre-container');
    const nombreInput = document.getElementById('nombre');
    
    if (snapshot.empty) {
      // ES NUEVO - Mostrar campo de nombre
      if (nombreContainer) {
        nombreContainer.style.display = 'block';
        nombreContainer.classList.remove('hidden');
      }
      if (nombreInput) nombreInput.focus();
      notify.info('¡Hola! Parece que eres nueva. Por favor ingresa tu nombre');
    } else {
      // YA EXISTE - Ocultar nombre
      if (nombreContainer) {
        nombreContainer.style.display = 'none';
        nombreContainer.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('Error verificando teléfono:', error);
  }
}

// ============================================
// ENVIAR CÓDIGO SMS
// ============================================
async function enviarCodigo() {
  const telefonoInput = document.getElementById('telefono');
  const nombreInput = document.getElementById('nombre');
  
  if (!telefonoInput) {
    notify.error('Error: No se encontró el campo de teléfono');
    return;
  }
  
  const telefono = telefonoInput.value.trim();
  
  // Validar teléfono
  const validacion = validarTelefonoMexico(telefono);
  if (!validacion.valido) {
    notify.error(validacion.error);
    telefonoInput.focus();
    return;
  }
  
  // Validar nombre si está visible
  const nombreContainer = document.getElementById('nombre-container');
  let nombreValidado = null;
  
  if (nombreContainer && nombreContainer.style.display !== 'none' && !nombreContainer.classList.contains('hidden')) {
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const valNombre = validarNombre(nombre);
    if (!valNombre.valido) {
      notify.error(valNombre.error);
      if (nombreInput) nombreInput.focus();
      return;
    }
    nombreValidado = valNombre.valor;
    tempNombre = nombreValidado; // Guardar temporalmente
  }

  mostrarLoader('Enviando código SMS...');
  
  try {
    // Inicializar Recaptcha
    if (!recaptchaVerifier) {
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
      });
    }
    
    confirmationResult = await auth.signInWithPhoneNumber(validacion.internacional, recaptchaVerifier);
    
    // Mostrar sección de código
    const loginSection = document.getElementById('login-section');
    const codigoSection = document.getElementById('codigo-section');
    const telefonoMostrar = document.getElementById('telefono-mostrar');
    
    if (loginSection) loginSection.style.display = 'none';
    if (codigoSection) {
      codigoSection.style.display = 'block';
      codigoSection.classList.remove('hidden');
    }
    if (telefonoMostrar) telefonoMostrar.textContent = validacion.formateado;
    
    notify.success('Código enviado a ' + validacion.formateado);
    
    // Enfocar input de código
    setTimeout(function() {
      const codigoInput = document.getElementById('codigo');
      if (codigoInput) codigoInput.focus();
    }, 100);
    
  } catch (error) {
    const mensaje = manejarErrorFirebase(error);
    notify.error(mensaje);
    recaptchaVerifier = null;
  } finally {
    ocultarLoader();
  }
}

// ============================================
// VERIFICAR CÓDIGO SMS
// ============================================
async function verificarCodigo() {
  const codigoInput = document.getElementById('codigo');
  const codigo = codigoInput ? codigoInput.value.trim() : '';
  
  if (!codigo || codigo.length !== 6) {
    notify.error('Ingresa el código de 6 dígitos');
    return;
  }

  mostrarLoader('Verificando código...');
  
  try {
    const result = await confirmationResult.confirm(codigo);
    const user = result.user;
    
    // Recuperar nombre temporal si existe
    const nombre = tempNombre;
    
    // Crear o actualizar usuario en Firestore
    const resultado = await crearOActualizarUsuario(user.uid, user.phoneNumber, nombre);
    
    if (resultado.esNuevo) {
      notify.success('¡Bienvenida a Glam Room! Tu cuenta ha sido creada');
    } else {
      notify.success('¡Bienvenida de vuelta!');
    }
    
    // Limpiar temporal
    tempNombre = null;
    
    // Cargar dashboard
    await mostrarDashboard(user.uid);
    
  } catch (error) {
    const mensaje = manejarErrorFirebase(error);
    notify.error(mensaje);
    if (codigoInput) {
      codigoInput.value = '';
      codigoInput.focus();
    }
  } finally {
    ocultarLoader();
  }
}

// ============================================
// MOSTRAR DASHBOARD
// ============================================
async function mostrarDashboard(userId) {
  mostrarLoader('Cargando tu tarjeta...');
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      notify.error('Error al cargar datos de usuario');
      return;
    }
    
    const datos = userSnap.data();
    currentUser = { id: userId, ...datos };
    
    // Ocultar login, mostrar dashboard
    const loginContainer = document.getElementById('login-container');
    const dashboard = document.getElementById('dashboard');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (dashboard) {
      dashboard.style.display = 'block';
      dashboard.classList.remove('hidden');
    }
    
    // Actualizar UI
    actualizarTarjetaLealtad(datos);
    await cargarHistorial(userId);
    
  } catch (error) {
    notify.error('Error al cargar tu información');
    console.error(error);
  } finally {
    ocultarLoader();
  }
}

// ============================================
// ACTUALIZAR UI DE TARJETA
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
    const nivel = (datos.nivel || 'bronce').toUpperCase();
    nivelEl.textContent = '✨ ' + nivel;
    nivelEl.className = 'user-level level-' + (datos.nivel || 'bronce');
  }
  
  // Visitas
  const visitasEl = document.getElementById('visit-count');
  if (visitasEl) {
    visitasEl.textContent = (datos.visitas || 0) + ' / 10 visitas';
  }
  
  // Estrellas
  const starsContainer = document.getElementById('stars-container');
  if (starsContainer) {
    starsContainer.innerHTML = '';
    const visitas = datos.visitas || 0;
    
    for (let i = 1; i <= 10; i++) {
      const star = document.createElement('span');
      star.className = 'star ' + (i <= visitas ? 'active' : '');
      star.innerHTML = '⭐';
      starsContainer.appendChild(star);
    }
  }
  
  // Recompensa
  const recompensaEl = document.getElementById('recompensa-banner');
  if (recompensaEl) {
    if (datos.recompensaDisponible) {
      recompensaEl.style.display = 'block';
      recompensaEl.classList.remove('hidden');
    } else {
      recompensaEl.style.display = 'none';
      recompensaEl.classList.add('hidden');
    }
  }
}

// ============================================
// CARGAR HISTORIAL
// ============================================
async function cargarHistorial(userId) {
  try {
    const historialRef = db.collection('users').doc(userId).collection('historial');
    const snapshot = await historialRef.orderBy('fecha', 'desc').limit(10).get();
    
    const lista = document.getElementById('historial-list');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    if (snapshot.empty) {
      lista.innerHTML = '<p class="empty-state">Aún no tienes visitas registradas</p>';
      return;
    }
    
    snapshot.forEach(function(doc) {
      const data = doc.data();
      const fecha = data.fecha ? data.fecha.toDate().toLocaleDateString('es-MX') : '-';
      
      const item = document.createElement('div');
      item.className = 'historial-item';
      item.innerHTML = `
        <div class="historial-fecha">${fecha}</div>
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
    const userRef = db.collection('users').doc(currentUser.id);
    
    await userRef.update({
      recompensaDisponible: false,
      ultimoCanje: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Registrar en historial
    await userRef.collection('historial').add({
      tipo: 'canje',
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      descripcion: 'Recompensa canjeada',
      premio: 'Servicio gratuito'
    });
    
    notify.success('¡Recompensa canjeada exitosamente!');
    await mostrarDashboard(currentUser.id);
    
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
    await auth.signOut();
    currentUser = null;
    
    const dashboard = document.getElementById('dashboard');
    const loginContainer = document.getElementById('login-container');
    const loginSection = document.getElementById('login-section');
    const codigoSection = document.getElementById('codigo-section');
    
    if (dashboard) dashboard.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'block';
    if (loginSection) {
      loginSection.style.display = 'block';
      loginSection.classList.remove('hidden');
    }
    if (codigoSection) {
      codigoSection.style.display = 'none';
      codigoSection.classList.add('hidden');
    }
    
    // Limpiar inputs
    const telefonoInput = document.getElementById('telefono');
    const codigoInput = document.getElementById('codigo');
    const nombreInput = document.getElementById('nombre');
    
    if (telefonoInput) telefonoInput.value = '';
    if (codigoInput) codigoInput.value = '';
    if (nombreInput) nombreInput.value = '';
    
    // Ocultar nombre
    const nombreContainer = document.getElementById('nombre-container');
    if (nombreContainer) {
      nombreContainer.style.display = 'none';
      nombreContainer.classList.add('hidden');
    }
    
    notify.success('Sesión cerrada correctamente');
  } catch (error) {
    notify.error('Error al cerrar sesión');
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Glam Room App Iniciada');
  
  // Verificar sesión existente
  auth.onAuthStateChanged(function(user) {
    if (user) {
      console.log('Usuario ya logueado:', user.uid);
      mostrarDashboard(user.uid);
    }
  });
  
  // Event Listeners
  const btnEnviar = document.getElementById('btn-enviar-codigo');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnLogout = document.getElementById('btn-logout');
  const telefonoInput = document.getElementById('telefono');
  const codigoInput = document.getElementById('codigo');
  
  if (btnEnviar) {
    btnEnviar.addEventListener('click', enviarCodigo);
  }
  
  if (btnVerificar) {
    btnVerificar.addEventListener('click', verificarCodigo);
  }
  
  if (btnLogout) {
    btnLogout.addEventListener('click', cerrarSesion);
  }
  
  // Verificar teléfono al perder foco
  if (telefonoInput) {
    telefonoInput.addEventListener('blur', verificarTelefonoExistente);
  }
  
  // Auto-verificar código al completar 6 dígitos
  if (codigoInput) {
    codigoInput.addEventListener('input', function(e) {
      if (e.target.value.length === 6) {
        verificarCodigo();
      }
    });
  }
});

// Exponer funciones globales para onclick en HTML
window.enviarCodigo = enviarCodigo;
window.verificarCodigo = verificarCodigo;
window.cerrarSesion = cerrarSesion;
window.canjearRecompensa = canjearRecompensa;
