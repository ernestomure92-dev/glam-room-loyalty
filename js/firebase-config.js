// CONFIGURACIÓN FIREBASE - REEMPLAZA CON TUS CREDENCIALES
const firebaseConfig = {
    apiKey: "AIzaSyBC4UPgUG-BK0QdXCMEiNcAQAp8DU2fB1U",
    authDomain: "glam-room-studio.firebaseapp.com",
    projectId: "glam-room-studio",
    storageBucket: "glam-room-studio.appspot.com",
    messagingSenderId: "724288769963",
    appId: "1:724288769963:web:02e78c225c0ba8c3a20cee"
};

// Inicializar Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

// Generar ID único basado en teléfono (para consistencia)
function generarUserId(telefono) {
  const limpio = telefono.replace(/\D/g, '');
  return 'user_' + limpio.slice(-10);
}

// Validar teléfono mexicano
function validarTelefono(telefono) {
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length < 10) return { ok: false, error: 'Mínimo 10 dígitos' };
  if (limpio.length > 13) return { ok: false, error: 'Número muy largo' };
  
  const diez = limpio.slice(-10);
  return {
    ok: true,
    formateado: diez.slice(0,2) + ' ' + diez.slice(2,6) + ' ' + diez.slice(6),
    internacional: '+52' + diez,
    userId: generarUserId(telefono)
  };
}

// Validar nombre
function validarNombre(nombre) {
  if (!nombre || nombre.trim().length < 2) {
    return { ok: false, error: 'Nombre muy corto' };
  }
  return { ok: true, valor: nombre.trim() };
}

// Notificaciones Toast
const Toast = {
  show: function(msg, type = 'info') {
    const colors = { success: '#4CAF50', error: '#f44336', info: '#2196F3' };
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: white;
      padding: 15px 20px; border-radius: 10px; border-left: 4px solid ${colors[type]};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;
      max-width: 300px; animation: slideIn 0.3s ease;
    `;
    div.innerHTML = `<strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${msg}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }
};

// Loader
const Loader = {
  show: function(msg = 'Cargando...') {
    let el = document.getElementById('app-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-loader';
      el.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 50px; height: 50px; border: 3px solid #ff6b9d; 
               border-top-color: transparent; border-radius: 50%; 
               animation: spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin-top: 15px; color: #c44569;">${msg}</p>
        </div>
      `;
      el.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255,255,255,0.95); display: flex;
        justify-content: center; align-items: center; z-index: 9999;
      `;
      document.body.appendChild(el);
      const style = document.createElement('style');
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
      document.head.appendChild(style);
    } else {
      el.querySelector('p').textContent = msg;
      el.style.display = 'flex';
    }
  },
  hide: function() {
    const el = document.getElementById('app-loader');
    if (el) el.style.display = 'none';
  }
};
