// ============================================
// GLAM ROOM - APP.JS 
// Compatible con estructura HTML existente
// ============================================

// ============================================
// CONFIGURACIÓN FIREBASE (AJUSTA CON TUS CREDENCIALES REALES)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDYZk3kQj5U7MTgO7kXb6n8kL8k5k5k5k5",
  authDomain: "glam-room-loyalty.firebaseapp.com",
  projectId: "glam-room-loyalty",
  storageBucket: "glam-room-loyalty.appspot.com",
  messagingSenderId: "724288769963",
  appId: "1:724288769963:web:02e78c225c0ba8c3a20cee"
};

// Inicializar Firebase (solo si no está inicializado)
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} else {
  console.error('Firebase no cargado. Verifica los scripts en HTML.');
}

const auth = firebase ? firebase.auth() : null;
const db = firebase ? firebase.firestore() : null;

// ============================================
// VARIABLES GLOBALES
// ============================================
let confirmationResult = null;
let recaptchaVerifier = null;
let currentUser = null;

// ============================================
// NOTIFICACIONES TOAST (NUEVO - No afecta diseño)
// ============================================
const Toast = {
  show: function(message, type) {
    type = type || 'info';
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };
    
    // Crear toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      color: #333;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-left: 4px solid ${colors[type]};
      z-index: 10000;
      font-family: inherit;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${type === 'success' ? '✅ Éxito' : type === 'error' ? '❌ Error' : 'ℹ️ Info'}</div>
      <div style="font-size: 14px; color: #666;">${message}</div>
    `;
    
    // Agregar animación
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto-remover
    setTimeout(function() {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
  }
};

// ============================================
// LOADER SIMPLE
// ============================================
const Loader = {
  show: function(msg) {
    let loader = document.getElementById('app-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'app-loader';
      loader.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 50px; height: 50px; border: 3px solid #ff6b9d; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin-top: 1rem; color: #c44569;">${msg || 'Cargando...'}</p>
        </div>
      `;
      loader.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255,255,255,0.95); display: flex;
        justify-content: center; align-items: center; z-index: 9999;
      `;
      document.body.appendChild(loader);
      
      const style = document.createElement('style');
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    } else {
      loader.querySelector('p').textContent = msg || 'Cargando...';
      loader.style.display = 'flex';
    }
  },
  hide: function() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.style.display = 'none';
  }
};

// ============================================
// VALIDACIONES
// ============================================
function validarTelefono(telefono) {
  if (!telefono) return { ok: false, error: 'Ingresa un número' };
  
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length < 10) return { ok: false, error: 'Mínimo 10 dígitos' };
  if (limpio.length > 13) return { ok: false, error: 'Número muy largo' };
  
  const diez = limpio.slice(-10);
  return { 
    ok: true, 
    internacional: '+52' + diez,
    formateado: diez.slice(0,2) + ' ' + diez.slice(2,6) + ' ' + diez.slice(6)
  };
}

function validarNombre(nombre) {
  if (!nombre || nombre.trim().length < 2) {
    return { ok: false, error: 'Nombre muy corto' };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
    return { ok: false, error: 'Solo letras permitidas' };
  }
  return { ok: true, valor: nombre.trim() };
}

// ============================================
// MANEJO DE ERRORES FIREBASE
// ============================================
function getErrorMessage(error) {
  const errores = {
    'auth/invalid-phone-number': 'Número no válido',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos',
    'auth/invalid-verification-code': 'Código incorrecto',
    'auth/code-expired': 'Código expirado',
    'permission-denied': 'No tienes permisos',
    'not-found': 'No se encontró el recurso',
    'network-request-failed': 'Error de conexión'
  };
  
  for (let code in errores) {
    if (error.code && error.code.indexOf(code) !== -1) return errores[code];
  }
  return error.message || 'Error desconocido';
}

// ============================================
// FUNCIÓN PRINCIPAL: CREAR/ACTUALIZAR USUARIO
// ============================================
async function guardarUsuario(userId, telefono, nombre) {
  try {
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    
    const ahora = firebase.firestore.FieldValue.serverTimestamp();
    
    if (!doc.exists) {
      // CREAR NUEVO USUARIO
      await userRef.set({
        telefono: telefono,
        nombre: nombre || 'Cliente',
        visitas: 0,
        nivel: 'bronce',
        recompensaDisponible: false,
        creado: ahora,
        ultimoAcceso: ahora
      });
      console.log('✅ Usuario creado:', userId);
      return { nuevo: true };
    } else {
      // ACTUALIZAR EXISTENTE
      await userRef.update({
        ultimoAcceso: ahora,
        telefono: telefono
      });
      console.log('✅ Usuario actualizado:', userId);
      return { nuevo: false, datos: doc.data() };
    }
  } catch (error) {
    console.error('❌ Error guardando usuario:', error);
    throw error;
  }
}

// ============================================
// VERIFICAR SI TELÉFONO EXISTE (PARA MOSTRAR NOMBRE)
// ============================================
async function checkTelefono() {
  const input = document.getElementById('telefono');
  const tel = input ? input.value.trim() : '';
  
  const val = validarTelefono(tel);
  if (!val.ok) return;
  
  try {
    const snap = await db.collection('users')
      .where('telefono', '==', val.internacional)
      .get();
    
    const nombreDiv = document.getElementById('nombre-container');
    const nombreInput = document.getElementById('nombre');
    
    if (snap.empty) {
      // NUEVO USUARIO - Mostrar campo nombre
      if (nombreDiv) {
        nombreDiv.style.display = 'block';
        nombreDiv.classList.remove('hidden');
      }
      if (nombreInput) {
        nombreInput.required = true;
        setTimeout(() => nombreInput.focus(), 100);
      }
      Toast.show('¡Hola! Ingresa tu nombre para registrarte', 'info');
    } else {
      // USUARIO EXISTENTE - Ocultar nombre
      if (nombreDiv) {
        nombreDiv.style.display = 'none';
        nombreDiv.classList.add('hidden');
      }
      if (nombreInput) nombreInput.required = false;
    }
  } catch (e) {
    console.log('Error verificando teléfono:', e);
  }
}

// ============================================
// ENVIAR CÓDIGO SMS
// ============================================
async function enviarCodigo() {
  const telInput = document.getElementById('telefono');
  const nomInput = document.getElementById('nombre');
  
  if (!telInput) {
    Toast.show('Error: Campo teléfono no encontrado', 'error');
    return;
  }
  
  // Validar teléfono
  const val = validarTelefono(telInput.value);
  if (!val.ok) {
    Toast.show(val.error, 'error');
    telInput.focus();
    return;
  }
  
  // Validar nombre si es visible
  const nomDiv = document.getElementById('nombre-container');
  let nombre = null;
  if (nomDiv && nomDiv.style.display !== 'none' && !nomDiv.classList.contains('hidden')) {
    const valNom = validarNombre(nomInput ? nomInput.value : '');
    if (!valNom.ok) {
      Toast.show(valNom.error, 'error');
      if (nomInput) nomInput.focus();
      return;
    }
    nombre = valNom.valor;
    // Guardar temporalmente
    window.tempNombreRegistro = nombre;
  }
  
  Loader.show('Enviando código...');
  
  try {
    // Inicializar recaptcha
    if (!recaptchaVerifier) {
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible'
      });
    }
    
    confirmationResult = await auth.signInWithPhoneNumber(val.internacional, recaptchaVerifier);
    
    // Cambiar vistas
    const loginSec = document.getElementById('login-section');
    const codigoSec = document.getElementById('codigo-section');
    const telMostrar = document.getElementById('telefono-mostrar');
    
    if (loginSec) loginSec.style.display = 'none';
    if (codigoSec) {
      codigoSec.style.display = 'block';
      codigoSec.classList.remove('hidden');
    }
    if (telMostrar) telMostrar.textContent = val.formateado;
    
    Toast.show('Código enviado a ' + val.formateado, 'success');
    
    // Focus en código
    setTimeout(() => {
      const codInput = document.getElementById('codigo');
      if (codInput) codInput.focus();
    }, 100);
    
  } catch (error) {
    Toast.show(getErrorMessage(error), 'error');
    recaptchaVerifier = null;
  } finally {
    Loader.hide();
  }
}

// ============================================
// VERIFICAR CÓDIGO Y LOGIN
// ============================================
async function verificarCodigo() {
  const codInput = document.getElementById('codigo');
  const codigo = codInput ? codInput.value.trim() : '';
  
  if (codigo.length !== 6) {
    Toast.show('Ingresa los 6 dígitos del código', 'error');
    return;
  }
  
  Loader.show('Verificando...');
  
  try {
    const result = await confirmationResult.confirm(codigo);
    const user = result.user;
    
    // Recuperar nombre temporal
    const nombre = window.tempNombreRegistro || null;
    delete window.tempNombreRegistro;
    
    // Guardar en Firestore
    const resultado = await guardarUsuario(user.uid, user.phoneNumber, nombre);
    
    if (resultado.nuevo) {
      Toast.show('¡Bienvenida a Glam Room! 🎉', 'success');
    } else {
      Toast.show('¡Bienvenida de vuelta! 💕', 'success');
    }
    
    // Mostrar dashboard
    await mostrarDashboard(user.uid);
    
  } catch (error) {
    Toast.show(getErrorMessage(error), 'error');
    if (codInput) {
      codInput.value = '';
      codInput.focus();
    }
  } finally {
    Loader.hide();
  }
}

// ============================================
// MOSTRAR DASHBOARD DEL USUARIO
// ============================================
async function mostrarDashboard(userId) {
  Loader.show('Cargando tu tarjeta...');
  
  try {
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      Toast.show('Error cargando datos', 'error');
      return;
    }
    
    const datos = doc.data();
    currentUser = { id: userId, ...datos };
    
    // Ocultar login, mostrar dashboard
    const loginCont = document.getElementById('login-container');
    const dashboard = document.getElementById('dashboard');
    
    if (loginCont) loginCont.style.display = 'none';
    if (dashboard) {
      dashboard.style.display = 'block';
      dashboard.classList.remove('hidden');
    }
    
    // Actualizar UI con datos
    actualizarUI(datos);
    
  } catch (error) {
    Toast.show('Error al cargar información', 'error');
    console.error(error);
  } finally {
    Loader.hide();
  }
}

// ============================================
// ACTUALIZAR INTERFAZ CON DATOS DEL USUARIO
// ============================================
function actualizarUI(datos) {
  // Nombre
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = datos.nombre || 'Cliente Glam';
  
  // Nivel
  const levelEl = document.getElementById('user-level');
  if (levelEl) {
    const nivel = (datos.nivel || 'bronce').toUpperCase();
    levelEl.textContent = '✨ ' + nivel;
    // Actualizar clase CSS según nivel
    levelEl.className = 'user-level level-' + (datos.nivel || 'bronce');
  }
  
  // Contador de visitas
  const visitEl = document.getElementById('visit-count');
  if (visitEl) {
    visitEl.textContent = (datos.visitas || 0) + ' / 10 visitas';
  }
  
  // Estrellas
  const starsCont = document.getElementById('stars-container');
  if (starsCont) {
    starsCont.innerHTML = '';
    const visitas = datos.visitas || 0;
    for (let i = 1; i <= 10; i++) {
      const star = document.createElement('span');
      star.className = 'star ' + (i <= visitas ? 'active' : '');
      star.innerHTML = '⭐';
      starsCont.appendChild(star);
    }
  }
  
  // Banner de recompensa
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
// CANJEAR RECOMPENSA
// ============================================
async function canjearRecompensa() {
  if (!currentUser) return;
  if (!confirm('¿Canjear tu recompensa ahora?')) return;
  
  Loader.show('Procesando...');
  
  try {
    await db.collection('users').doc(currentUser.id).update({
      recompensaDisponible: false,
      ultimoCanje: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    Toast.show('¡Recompensa canjeada! 🎉', 'success');
    await mostrarDashboard(currentUser.id);
    
  } catch (error) {
    Toast.show('Error al canjear', 'error');
  } finally {
    Loader.hide();
  }
}

// ============================================
// CERRAR SESIÓN
// ============================================
async function cerrarSesion() {
  try {
    await auth.signOut();
    currentUser = null;
    
    // Resetear UI
    const dashboard = document.getElementById('dashboard');
    const loginCont = document.getElementById('login-container');
    const loginSec = document.getElementById('login-section');
    const codigoSec = document.getElementById('codigo-section');
    
    if (dashboard) dashboard.style.display = 'none';
    if (loginCont) loginCont.style.display = 'block';
    if (loginSec) {
      loginSec.style.display = 'block';
      loginSec.classList.remove('hidden');
    }
    if (codigoSec) {
      codigoSec.style.display = 'none';
      codigoSec.classList.add('hidden');
    }
    
    // Limpiar inputs
    const tel = document.getElementById('telefono');
    const cod = document.getElementById('codigo');
    const nom = document.getElementById('nombre');
    
    if (tel) tel.value = '';
    if (cod) cod.value = '';
    if (nom) nom.value = '';
    
    // Ocultar nombre
    const nomDiv = document.getElementById('nombre-container');
    if (nomDiv) {
      nomDiv.style.display = 'none';
      nomDiv.classList.add('hidden');
    }
    
    Toast.show('Sesión cerrada', 'success');
    
  } catch (error) {
    Toast.show('Error al cerrar sesión', 'error');
  }
}

// ============================================
// INICIALIZACIÓN AL CARGAR PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🌸 Glam Room App iniciada');
  
  // Verificar si hay sesión activa
  if (auth) {
    auth.onAuthStateChanged(function(user) {
      if (user) {
        console.log('👤 Usuario logueado:', user.uid);
        mostrarDashboard(user.uid);
      }
    });
  }
  
  // Asignar event listeners
  const btnEnviar = document.getElementById('btn-enviar-codigo');
  const btnVerificar = document.getElementById('btn-verificar');
  const btnLogout = document.getElementById('btn-logout');
  const inputTel = document.getElementById('telefono');
  const inputCod = document.getElementById('codigo');
  
  if (btnEnviar) btnEnviar.addEventListener('click', enviarCodigo);
  if (btnVerificar) btnVerificar.addEventListener('click', verificarCodigo);
  if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);
  
  // Verificar teléfono al salir del campo
  if (inputTel) inputTel.addEventListener('blur', checkTelefono);
  
  // Auto-verificar código al completar 6 dígitos
  if (inputCod) {
    inputCod.addEventListener('input', function(e) {
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
