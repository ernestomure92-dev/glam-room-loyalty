// Helpers para UI

/**
 * Muestra loader global
 */
export function mostrarLoader(mensaje = 'Cargando...') {
  let loader = document.getElementById('global-loader');
  
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <p class="loader-text">${mensaje}</p>
      </div>
    `;
    loader.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    `;
    
    // Estilos del spinner
    const style = document.createElement('style');
    style.textContent = `
      .loader-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid #ff6b9d;
        border-top-color: transparent;
        border-radius: 50%;
        animation: loader-spin 1s linear infinite;
      }
      @keyframes loader-spin {
        to { transform: rotate(360deg); }
      }
      .loader-content {
        text-align: center;
      }
      .loader-text {
        margin-top: 1rem;
        color: #c44569;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(loader);
  } else {
    loader.querySelector('.loader-text').textContent = mensaje;
    loader.style.display = 'flex';
  }
}

/**
 * Oculta loader global
 */
export function ocultarLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * Maneja errores de Firebase con mensajes amigables
 */
export function manejarErrorFirebase(error) {
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
    'failed-precondition': 'Operación no permitida en este momento',
    'unauthenticated': 'Debes iniciar sesión para continuar',
    'network-request-failed': 'Error de conexión. Verifica tu internet',
    'internal': 'Error interno del servidor. Intenta de nuevo',
    'unavailable': 'Servicio no disponible. Intenta más tarde'
  };

  // Buscar coincidencia parcial
  for (const [code, message] of Object.entries(mensajes)) {
    if (error.code?.includes(code) || error.message?.includes(code)) {
      return message;
    }
  }

  // Mensaje genérico
  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
}

/**
 * Debounce para inputs
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Formatea fecha para mostrar
 */
export function formatearFecha(fecha) {
  const opciones = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(fecha).toLocaleDateString('es-MX', opciones);
}

/**
 * Formatea hora
 */
export function formatearHora(hora) {
  return new Date(`2000-01-01T${hora}`).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
