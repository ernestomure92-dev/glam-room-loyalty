// ============================================
// ADMIN PANEL - GLAM ROOM
// ============================================

// Verificar que sea admin (simple: cualquiera puede entrar por ahora)
document.addEventListener('DOMContentLoaded', function() {
  // Configurar fecha de hoy en filtro
  const hoy = new Date().toISOString().split('T')[0];
  const filtroFecha = document.getElementById('filtro-fecha');
  if (filtroFecha) {
    filtroFecha.value = hoy;
  }
  
  // Cargar datos iniciales
  cargarCitasAdmin();
  cargarClientes();
});

// ============================================
// TABS
// ============================================
function mostrarTab(tabName) {
  // Ocultar todos
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mostrar seleccionado
  document.getElementById('tab-' + tabName).classList.remove('hidden');
  event.target.classList.add('active');
  
  // Recargar datos
  if (tabName === 'citas') cargarCitasAdmin();
  if (tabName === 'clientes') cargarClientes();
}

// ============================================
// CARGAR CITAS (ADMIN)
// ============================================
async function cargarCitasAdmin() {
  const contenedor = document.getElementById('lista-citas-admin');
  const fechaFiltro = document.getElementById('filtro-fecha')?.value;
  
  if (!contenedor) return;
  
  contenedor.innerHTML = '<p class="loading-text">Cargando...</p>';
  
  try {
    let query = db.collection('appointments').orderBy('fecha').orderBy('hora');
    
    // Si hay fecha seleccionada, filtrar
    if (fechaFiltro) {
      query = db.collection('appointments')
        .where('fecha', '==', fechaFiltro)
        .orderBy('hora');
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      contenedor.innerHTML = '<p class="empty-state">No hay citas registradas</p>';
      return;
    }
    
    let html = '';
    const hoy = new Date().toISOString().split('T')[0];
    
    snapshot.forEach(doc => {
      const cita = doc.data();
      const esHoy = cita.fecha === hoy;
      const claseHoy = esHoy ? 'cita-hoy' : '';
      
      html += `
        <div class="admin-cita-card ${claseHoy}">
          <div class="cita-info">
            <strong>${cita.nombre}</strong>
            <span class="cita-tel">${cita.telefono}</span>
          </div>
          <div class="cita-servicio-fecha">
            <span class="servicio">${cita.servicio}</span>
            <span class="fecha">${formatearFecha(cita.fecha)} ${cita.hora}</span>
          </div>
          <div class="cita-actions">
            <span class="estado-badge ${cita.estado}">${cita.estado}</span>
            ${esHoy ? `<button onclick="completarCita('${doc.id}', '${cita.userId}')" class="btn-small btn-success">Completar</button>` : ''}
            <button onclick="cancelarCitaAdmin('${doc.id}')" class="btn-small btn-cancel">Cancelar</button>
          </div>
        </div>
      `;
    });
    
    contenedor.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando citas:', error);
    contenedor.innerHTML = '<p class="error-text">Error al cargar citas</p>';
  }
}

// ============================================
// CARGAR CLIENTES
// ============================================
async function cargarClientes() {
  const contenedor = document.getElementById('lista-clientes');
  if (!contenedor) return;
  
  contenedor.innerHTML = '<p class="loading-text">Cargando...</p>';
  
  try {
    const snapshot = await db.collection('users').orderBy('ultimoAcceso', 'desc').get();
    
    if (snapshot.empty) {
      contenedor.innerHTML = '<p class="empty-state">No hay clientes registrados</p>';
      return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      html += `
        <div class="cliente-card">
          <div class="cliente-info">
            <strong>${user.nombre || 'Sin nombre'}</strong>
            <span>${user.telefonoFormateado || user.telefono}</span>
          </div>
          <div class="cliente-stats">
            <span class="stat">⭐ ${user.visitas || 0} visitas</span>
            <span class="nivel-badge ${user.nivel || 'bronce'}">${user.nivel || 'bronce'}</span>
          </div>
        </div>
      `;
    });
    
    contenedor.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando clientes:', error);
    contenedor.innerHTML = '<p class="error-text">Error al cargar clientes</p>';
  }
}

// ============================================
// BUSCAR CLIENTES
// ============================================
function buscarClientes() {
  const texto = document.getElementById('buscar-cliente').value.toLowerCase();
  const cards = document.querySelectorAll('.cliente-card');
  
  cards.forEach(card => {
    const contenido = card.textContent.toLowerCase();
    card.style.display = contenido.includes(texto) ? 'block' : 'none';
  });
}

// ============================================
// BUSCAR CLIENTE PARA REGISTRO
// ============================================
async function buscarClienteRegistro() {
  const telefono = document.getElementById('registro-telefono').value;
  const val = validarTelefono(telefono);
  
  if (!val.ok) {
    Toast.show('Teléfono no válido', 'error');
    return;
  }
  
  try {
    const userRef = db.collection('users').doc(val.userId);
    const userSnap = await userRef.get();
    
    const infoDiv = document.getElementById('info-cliente-registro');
    const noEncontrado = document.getElementById('cliente-no-encontrado');
    
    if (userSnap.exists) {
      const user = userSnap.data();
      document.getElementById('registro-nombre').textContent = user.nombre || 'Cliente';
      document.getElementById('registro-visitas').textContent = user.visitas || 0;
      document.getElementById('registro-nivel').textContent = (user.nivel || 'bronce').toUpperCase();
      
      // Guardar referencia
      window.clienteActualRegistro = { id: val.userId, ...user };
      
      infoDiv.classList.remove('hidden');
      noEncontrado.classList.add('hidden');
    } else {
      infoDiv.classList.add('hidden');
      noEncontrado.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================
// REGISTRAR VISITA
// ============================================
async function registrarVisita() {
  if (!window.clienteActualRegistro) {
    Toast.show('Primero busca un cliente', 'error');
    return;
  }
  
  const servicio = document.getElementById('registro-servicio').value;
  const cliente = window.clienteActualRegistro;
  
  Loader.show('Registrando visita...');
  
  try {
    // Calcular nueva visita y nivel
    const nuevasVisitas = (cliente.visitas || 0) + 1;
    let nuevoNivel = 'bronce';
    let recompensa = false;
    
    if (nuevasVisitas >= 50) nuevoNivel = 'diamante';
    else if (nuevasVisitas >= 25) nuevoNivel = 'oro';
    else if (nuevasVisitas >= 10) nuevoNivel = 'plata';
    
    // Recompensa cada 10 visitas
    if (nuevasVisitas % 10 === 0) {
      recompensa = true;
    }
    
    // Actualizar usuario
    await db.collection('users').doc(cliente.id).update({
      visitas: nuevasVisitas,
      nivel: nuevoNivel,
      recompensaDisponible: recompensa,
      ultimaVisita: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Agregar al historial
    await db.collection('users').doc(cliente.id).collection('historial').add({
      tipo: 'visita',
      servicio: servicio,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mensaje especial si ganó recompensa
    if (recompensa) {
      Toast.show(`🎉 ¡${cliente.nombre} completó ${nuevasVisitas} visitas y ganó una recompensa!`, 'success');
    } else {
      Toast.show(`✅ Visita registrada. Total: ${nuevasVisitas} visitas`, 'success');
    }
    
    // Limpiar
    document.getElementById('registro-telefono').value = '';
    document.getElementById('info-cliente-registro').classList.add('hidden');
    window.clienteActualRegistro = null;
    
  } catch (error) {
    console.error('Error:', error);
    Toast.show('Error al registrar visita', 'error');
  } finally {
    Loader.hide();
  }
}

// ============================================
// COMPLETAR CITA (Sumar visita automáticamente)
// ============================================
async function completarCita(citaId, userId) {
  if (!confirm('¿Marcar esta cita como completada? Se sumará 1 visita al cliente.')) return;
  
  Loader.show('Completando cita...');
  
  try {
    // Marcar cita como completada
    await db.collection('appointments').doc(citaId).update({
      estado: 'completada',
      completada: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Sumar visita al cliente
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const user = userSnap.data();
      const nuevasVisitas = (user.visitas || 0) + 1;
      
      let nuevoNivel = 'bronce';
      if (nuevasVisitas >= 50) nuevoNivel = 'diamante';
      else if (nuevasVisitas >= 25) nuevoNivel = 'oro';
      else if (nuevasVisitas >= 10) nuevoNivel = 'plata';
      
      await userRef.update({
        visitas: nuevasVisitas,
        nivel: nuevoNivel,
        recompensaDisponible: nuevasVisitas % 10 === 0,
        ultimaVisita: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Agregar al historial
      await userRef.collection('historial').add({
        tipo: 'visita',
        servicio: 'Cita completada',
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    Toast.show('Cita completada y visita registrada', 'success');
    cargarCitasAdmin();
    
  } catch (error) {
    console.error('Error:', error);
    Toast.show('Error al completar cita', 'error');
  } finally {
    Loader.hide();
  }
}

// ============================================
// CANCELAR CITA (ADMIN)
// ============================================
async function cancelarCitaAdmin(citaId) {
  if (!confirm('¿Cancelar esta cita?')) return;
  
  try {
    await db.collection('appointments').doc(citaId).update({
      estado: 'cancelada',
      cancelada: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    Toast.show('Cita cancelada', 'success');
    cargarCitasAdmin();
    
  } catch (error) {
    Toast.show('Error al cancelar', 'error');
  }
}

// ============================================
// UTILIDADES
// ============================================
function formatearFecha(fecha) {
  if (!fecha) return '-';
  const opciones = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-MX', opciones);
}

// Exponer funciones
window.mostrarTab = mostrarTab;
window.cargarCitasAdmin = cargarCitasAdmin;
window.cargarClientes = cargarClientes;
window.buscarClientes = buscarClientes;
window.buscarClienteRegistro = buscarClienteRegistro;
window.registrarVisita = registrarVisita;
window.completarCita = completarCita;
window.cancelarCitaAdmin = cancelarCitaAdmin;
