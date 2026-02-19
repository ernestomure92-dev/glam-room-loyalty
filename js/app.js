// ============================================
// GLAM ROOM APP - LOGIN SIMPLE (SIN SMS)
// ============================================

let currentUser = null;

// ============================================
// LOGIN - BUSCAR O CREAR USUARIO
// ============================================
async function login() {
  const nombreInput = document.getElementById('nombre');
  const telefonoInput = document.getElementById('telefono');
  
  const nombre = nombreInput ? nombreInput.value : '';
  const telefono = telefonoInput ? telefonoInput.value : '';
  
  // Validaciones
  const valNombre = validarNombre(nombre);
  if (!valNombre.ok) {
    Toast.show(valNombre.error, 'error');
    if (nombreInput) nombreInput.focus();
    return;
  }
  
  const valTel = validarTelefono(telefono);
  if (!valTel.ok) {
    Toast.show(valTel.error, 'error');
    if (telefonoInput) telefono.focus();
    return;
  }
  
  Loader.show('Buscando tu cuenta...');
  
  try {
    const userId = valTel.userId;
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      // USUARIO EXISTENTE - Actualizar último acceso
      await userRef.update({
        ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp(),
        nombre: valNombre.valor // Actualizar nombre por si cambió
      });
      
      currentUser = { id: userId, ...userSnap.data(), nombre: valNombre.valor };
      Toast.show('¡Bienvenida de vuelta!', 'success');
      
    } else {
      // NUEVO USUARIO - Crear documento
      const nuevoUsuario = {
        nombre: valNombre.valor,
        telefono: valTel.internacional,
        telefonoFormateado: valTel.formateado,
        visitas: 0,
        nivel: 'bronce',
        recompensaDisponible: false,
        creado: firebase.firestore.FieldValue.serverTimestamp(),
        ultimoAcceso: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await userRef.set(nuevoUsuario);
      currentUser = { id: userId, ...nuevoUsuario };
      Toast.show('¡Bienvenida a Glam Room! Tu cuenta ha sido creada', 'success');
    }
    
    // Guardar en session
    sessionStorage.setItem('glamUser', JSON.stringify({
      id: userId,
      nombre: valNombre.valor,
      telefono: valTel.internacional
    }));
    
    // Mostrar dashboard
    mostrarDashboard();
    
  } catch (error) {
    console.error('Error login:', error);
    Toast.show('Error al iniciar sesión. Intenta de nuevo.', 'error');
  } finally {
    Loader.hide();
  }
}

// ============================================
// MOSTRAR DASHBOARD
// ============================================
function mostrarDashboard() {
  if (!currentUser) return;
  
  // Ocultar login
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.style.display = 'none';
  
  // Mostrar dashboard
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = 'block';
    dashboard.classList.remove('hidden');
  }
  
  // Actualizar UI
  actualizarTarjeta();
  cargarHistorial();
}

// ============================================
// ACTUALIZAR TARJETA DE LEALTAD
// ============================================
function actualizarTarjeta() {
  if (!currentUser) return;
  
  // Nombre
  const nameEl = document.getElementById('user-name');
  if (nameEl) nameEl.textContent = currentUser.nombre;
  
  // Nivel
  const levelEl = document.getElementById('user-level');
  if (levelEl) {
    const nivel = (currentUser.nivel || 'bronce').toUpperCase();
    levelEl.textContent = '✨ ' + nivel;
    levelEl.className = 'user-level level-' + (currentUser.nivel || 'bronce');
  }
  
  // Visitas
  const visitEl = document.getElementById('visit-count');
  if (visitEl) {
    visitEl.textContent = (currentUser.visitas || 0) + ' / 10 visitas';
  }
  
  // Estrellas
  const starsContainer = document.getElementById('stars-container');
  if (starsContainer) {
    starsContainer.innerHTML = '';
    const visitas = currentUser.visitas || 0;
    
    for (let i = 1; i <= 10; i++) {
      const star = document.createElement('span');
      star.className = 'star ' + (i <= visitas ? 'active' : '');
      star.innerHTML = '⭐';
      star.title = 'Visita ' + i;
      starsContainer.appendChild(star);
    }
  }
  
  // Recompensa
  const recompensaEl = document.getElementById('recompensa-banner');
  if (recompensaEl) {
    if (currentUser.recompensaDisponible) {
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
async function cargarHistorial() {
  if (!currentUser) return;
  
  const lista = document.getElementById('historial-list');
  if (!lista) return;
  
  try {
    const historialRef = db.collection('users').doc(currentUser.id)
      .collection('historial').orderBy('fecha', 'desc');
    const snapshot = await historialRef.get();
    
    lista.innerHTML = '';
    
    if (snapshot.empty) {
      lista.innerHTML = '<p class="empty-state">Aún no tienes visitas registradas</p>';
      return;
    }
    
    snapshot.forEach(doc => {
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
  if (!currentUser || !currentUser.recompensaDisponible) return;
  
  if (!confirm('¿Canjear tu recompensa ahora?')) return;
  
  Loader.show('Procesando...');
  
  try {
    await db.collection('users').doc(currentUser.id).update({
      recompensaDisponible: false,
      visitas: 0, // Resetear o mantener según prefieras
      ultimoCanje: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Registrar en historial
    await db.collection('users').doc(currentUser.id).collection('historial').add({
      tipo: 'canje',
      servicio: 'Recompensa canjeada',
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Actualizar local
    currentUser.recompensaDisponible = false;
    currentUser.visitas = 0;
    
    Toast.show('¡Recompensa canjeada exitosamente! 🎉', 'success');
    actualizarTarjeta();
    
  } catch (error) {
    console.error('Error:', error);
    Toast.show('Error al canjear', 'error');
  } finally {
    Loader.hide();
  }
}

// ============================================
// CERRAR SESIÓN
// ============================================
function cerrarSesion() {
  currentUser = null;
  sessionStorage.removeItem('glamUser');
  
  const dashboard = document.getElementById('dashboard');
  const loginContainer = document.getElementById('login-container');
  
  if (dashboard) dashboard.style.display = 'none';
  if (loginContainer) {
    loginContainer.style.display = 'block';
    loginContainer.classList.remove('hidden');
  }
  
  // Limpiar inputs
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => input.value = '');
  
  Toast.show('Sesión cerrada', 'success');
}

// ============================================
// VERIFICAR SESIÓN GUARDADA
// ============================================
function verificarSesion() {
  const saved = sessionStorage.getItem('glamUser');
  if (saved) {
    const data = JSON.parse(saved);
    // Recuperar datos de Firestore
    Loader.show('Restaurando sesión...');
    
    db.collection('users').doc(data.id).get().then(doc => {
      if (doc.exists) {
        currentUser = { id: data.id, ...doc.data() };
        mostrarDashboard();
      } else {
        sessionStorage.removeItem('glamUser');
      }
      Loader.hide();
    }).catch(() => {
      Loader.hide();
    });
  }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🌸 Glam Room App iniciada');
  
  // Verificar si hay sesión guardada
  verificarSesion();
  
  // Event listeners
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  
  if (btnLogin) btnLogin.addEventListener('click', login);
  if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);
  
  // Login con Enter
  const inputs = document.querySelectorAll('#login-container input');
  inputs.forEach(input => {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') login();
    });
  });
});

// Exponer funciones globales
window.login = login;
window.cerrarSesion = cerrarSesion;
window.canjearRecompensa = canjearRecompensa;
