// ============================================
// APPOINTMENTS - AGENDAR CITAS (CORREGIDO)
// ============================================

let citaActual = {
  servicio: 'Manicure',
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
    radio.addEventListener('change', function() {
      citaActual.servicio = this.value;
      citaActual.duracion = parseInt(this.dataset.duracion);
      cargarHorarios();
    });
  });
  
  // Cargar horarios iniciales
  setTimeout(cargarHorarios, 500);
  actualizarResumen();
});

// ============================================
// CARGAR HORARIOS DISPONIBLES (SIMPLIFICADO)
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
    // Consulta simple sin ordenamiento complejo
    const citasRef = db.collection('appointments');
    const snapshot = await citasRef.get(); // Traer todas (filtrar en cliente por ahora)
    
    const ocupados = [];
    snapshot.forEach(doc => {
      const cita = doc.data();
      // Solo citas de esta fecha y no canceladas
      if (cita.fecha === fecha && cita.estado !== 'cancelada') {
        const inicio = horaAMinutos(cita.hora);
        ocupados.push({
          inicio: inicio,
          fin: inicio + (cita.duracion || 60)
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
          horarios.push({
            hora: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`,
            minutos: inicio
          });
        }
      }
    }
    
    // Renderizar
    if (horarios.length === 0) {
      contenedor.innerHTML = '<p class="error-text">No hay horarios disponibles para esta fecha</p>';
    } else {
      contenedor.innerHTML = horarios.map(h => `
        <button type="button" class="time-slot" onclick="seleccionarHora('${h.hora}')" data-hora="${h.hora}">
          ${h.hora}
        </button>
      `).join('');
    }
    
    actualizarResumen();
    
  } catch (error) {
    console.error('Error cargando horarios:', error);
    contenedor.innerHTML = '<p class="error-text">Error al cargar horarios. Intenta de nuevo.</p>';
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
  document.getElementById('resumen-servicio').textContent = citaActual.servicio;
  document.getElementById('resumen-fecha').textContent = citaActual.fecha || '-';
  document.getElementById('resumen-hora').textContent = citaActual.hora || '-';
  document.getElementById('resumen-duracion').textContent = citaActual.duracion + ' min';
}

// ============================================
// CONFIRMAR CITA (CORREGIDO)
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
    const citaData = {
      userId: userData.id,
      nombre: userData.nombre,
      telefono: userData.telefono,
      servicio: citaActual.servicio,
      duracion: citaActual.duracion,
      fecha: citaActual.fecha,
      hora: citaActual.hora,
      estado: 'confirmada',
      creada: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Guardando cita:', citaData);
    
    await db.collection('appointments').add(citaData);
    
    // Mostrar modal éxito
    document.getElementById('modal-exito').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error guardando cita:', error);
    Toast.show('Error al agendar: ' + error.message, 'error');
  } finally {
    Loader.hide();
  }
}

// Exponer funciones
window.seleccionarHora = seleccionarHora;
window.confirmarCita = confirmarCita;
