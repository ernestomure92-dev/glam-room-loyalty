// ============================================
// APPOINTMENTS - AGENDAR CITAS
// ============================================

let citaActual = {
  servicio: '',
  duracion: 60,
  fecha: '',
  hora: ''
};

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', function() {
  const saved = sessionStorage.getItem('glamUser');
  if (!saved) {
    Toast.show('Debes iniciar sesión primero', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }
  
  // Configurar fecha mínima (hoy)
  const fechaInput = document.getElementById('fecha-cita');
  if (fechaInput) {
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;
    fechaInput.value = hoy;
    
    // Escuchar cambio de fecha
    fechaInput.addEventListener('change', cargarHorarios);
  }
  
  // Escuchar cambio de servicio
  const servicios = document.querySelectorAll('input[name="servicio"]');
  servicios.forEach(radio => {
    radio.addEventListener('change', actualizarResumen);
  });
  
  // Cargar horarios iniciales
  cargarHorarios();
  actualizarResumen();
});

// ============================================
// CARGAR HORARIOS DISPONIBLES
// ============================================
async function cargarHorarios() {
  const fechaInput = document.getElementById('fecha-cita');
  const contenedor = document.getElementById('horarios-disponibles');
  
  if (!fechaInput || !contenedor) return;
  
  const fecha = fechaInput.value;
  if (!fecha) {
    contenedor.innerHTML = '<p class="info-text">Selecciona una fecha</p>';
    return;
  }
  
  citaActual.fecha = fecha;
  
  // Verificar si es domingo
  const fechaObj = new Date(fecha);
  if (fechaObj.getDay() === 0) {
    contenedor.innerHTML = '<p class="error-text">No atendemos los domingos</p>';
    return;
  }
  
  Loader.show('Cargando horarios...');
  
  try {
    // Obtener citas existentes
    const citasRef = db.collection('appointments');
    const snapshot = await citasRef.where('fecha', '==', fecha).get();
    
    const ocupados = [];
    snapshot.forEach(doc => {
      const cita = doc.data();
      if (cita.estado !== 'cancelada') {
        ocupados.push({
          inicio: horaAMinutos(cita.hora),
          fin: horaAMinutos(cita.hora) + (cita.duracion || 60)
        });
      }
    });
    
    // Generar horarios disponibles (9:00 - 19:00)
    const horarios = [];
    for (let h = 9; h < 19; h++) {
      for (let m = 0; m < 60; m += 30) {
        const inicio = h * 60 + m;
        const fin = inicio + citaActual.duracion;
        
        // Verificar solapamiento
        const disponible = !ocupados.some(ocup => 
          inicio < ocup.fin && fin > ocup.inicio
        );
        
        if (disponible && fin <= 19 * 60) {
          horarios.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
        }
      }
    }
    
    // Renderizar
    if (horarios.length === 0) {
      contenedor.innerHTML = '<p class="error-text">No hay horarios disponibles para esta fecha</p>';
    } else {
      contenedor.innerHTML = horarios.map(hora => `
        <button class="time-slot" onclick="seleccionarHora('${hora}')" data-hora="${hora}">
          ${hora}
        </button>
      `).join('');
    }
    
    actualizarResumen();
    
  } catch (error) {
    console.error('Error cargando horarios:', error);
    contenedor.innerHTML = '<p class="error-text">Error al cargar horarios</p>';
  } finally {
    Loader.hide();
  }
}

function horaAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// ============================================
// SELECCIONAR HORA
// ============================================
function seleccionarHora(hora) {
  citaActual.hora = hora;
  
  // Actualizar UI
  document.querySelectorAll('.time-slot').forEach(btn => {
    btn.classList.remove('selected');
  });
  const seleccionado = document.querySelector(`[data-hora="${hora}"]`);
  if (seleccionado) seleccionado.classList.add('selected');
  
  actualizarResumen();
}

// ============================================
// ACTUALIZAR RESUMEN
// ============================================
function actualizarResumen() {
  // Obtener servicio seleccionado
  const servicioSeleccionado = document.querySelector('input[name="servicio"]:checked');
  if (servicioSeleccionado) {
    citaActual.servicio = servicioSeleccionado.value;
    citaActual.duracion = parseInt(servicioSeleccionado.dataset.duracion);
  }
  
  // Actualizar DOM
  document.getElementById('resumen-servicio').textContent = citaActual.servicio || '-';
  document.getElementById('resumen-fecha').textContent = citaActual.fecha || '-';
  document.getElementById('resumen-hora').textContent = citaActual.hora || '-';
  document.getElementById('resumen-duracion').textContent = citaActual.duracion ? citaActual.duracion + ' min' : '-';
}

// ============================================
// CONFIRMAR CITA
// ============================================
async function confirmarCita() {
  // Validaciones
  if (!citaActual.servicio) {
    Toast.show('Selecciona un servicio', 'error');
    return;
  }
  if (!citaActual.fecha) {
    Toast.show('Selecciona una fecha', 'error');
    return;
  }
  if (!citaActual.hora) {
    Toast.show('Selecciona una hora', 'error');
    return;
  }
  
  const userData = JSON.parse(sessionStorage.getItem('glamUser'));
  if (!userData) {
    Toast.show('Debes iniciar sesión', 'error');
    return;
  }
  
  Loader.show('Guardando cita...');
  
  try {
    // Crear cita
    await db.collection('appointments').add({
      userId: userData.id,
      nombre: userData.nombre,
      telefono: userData.telefono,
      servicio: citaActual.servicio,
      duracion: citaActual.duracion,
      fecha: citaActual.fecha,
      hora: citaActual.hora,
      estado: 'confirmada',
      creada: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mostrar modal éxito
    document.getElementById('modal-exito').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error guardando cita:', error);
    Toast.show('Error al agendar. Intenta de nuevo.', 'error');
  } finally {
    Loader.hide();
  }
}

// Exponer funciones
window.seleccionarHora = seleccionarHora;
window.confirmarCita = confirmarCita;
