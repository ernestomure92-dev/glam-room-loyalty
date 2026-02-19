// ============================================
// CARGAR CITAS (ADMIN) - SIMPLIFICADO
// ============================================
async function cargarCitasAdmin() {
  const contenedor = document.getElementById('lista-citas-admin');
  const fechaFiltro = document.getElementById('filtro-fecha')?.value;
  
  if (!contenedor) return;
  
  contenedor.innerHTML = '<p class="loading-text">Cargando...</p>';
  
  try {
    // Consulta simple
    const snapshot = await db.collection('appointments').get();
    
    // Filtrar y ordenar en cliente
    let citas = [];
    snapshot.forEach(doc => {
      const cita = doc.data();
      if (!fechaFiltro || cita.fecha === fechaFiltro) {
        citas.push({ id: doc.id, ...cita });
      }
    });
    
    // Ordenar por fecha y hora
    citas.sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora);
    });
    
    if (citas.length === 0) {
      contenedor.innerHTML = '<p class="empty-state">No hay citas registradas</p>';
      return;
    }
    
    let html = '';
    const hoy = new Date().toISOString().split('T')[0];
    
    citas.forEach(cita => {
      const esHoy = cita.fecha === hoy;
      const claseHoy = esHoy ? 'cita-hoy' : '';
      
      html += `
        <div class="admin-cita-card ${claseHoy}">
          <div class="cita-info">
            <strong>${cita.nombre || 'Sin nombre'}</strong>
            <span class="cita-tel">${cita.telefono || '-'}</span>
          </div>
          <div class="cita-servicio-fecha">
            <span class="servicio">${cita.servicio}</span>
            <span class="fecha">${formatearFecha(cita.fecha)} ${cita.hora}</span>
          </div>
          <div class="cita-actions">
            <span class="estado-badge ${cita.estado || 'confirmada'}">${cita.estado || 'confirmada'}</span>
            ${esHoy && cita.estado !== 'completada' ? `
              <button onclick="completarCita('${cita.id}', '${cita.userId}')" class="btn-small btn-success">Completar</button>
            ` : ''}
            ${cita.estado !== 'cancelada' ? `
              <button onclick="cancelarCitaAdmin('${cita.id}')" class="btn-small btn-cancel">Cancelar</button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    contenedor.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando citas:', error);
    contenedor.innerHTML = '<p class="error-text">Error al cargar citas: ' + error.message + '</p>';
  }
}

// ============================================
// CARGAR CLIENTES - SIMPLIFICADO
// ============================================
async function cargarClientes() {
  const contenedor = document.getElementById('lista-clientes');
  if (!contenedor) return;
  
  contenedor.innerHTML = '<p class="loading-text">Cargando...</p>';
  
  try {
    const snapshot = await db.collection('users').get();
    
    let clientes = [];
    snapshot.forEach(doc => {
      clientes.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar por último acceso (más reciente primero)
    clientes.sort((a, b) => {
      const fechaA = a.ultimoAcceso ? a.ultimoAcceso.toMillis() : 0;
      const fechaB = b.ultimoAcceso ? b.ultimoAcceso.toMillis() : 0;
      return fechaB - fechaA;
    });
    
    if (clientes.length === 0) {
      contenedor.innerHTML = '<p class="empty-state">No hay clientes registrados</p>';
      return;
    }
    
    let html = '';
    clientes.forEach(user => {
      html += `
        <div class="cliente-card">
          <div class="cliente-info">
            <strong>${user.nombre || 'Sin nombre'}</strong>
            <span>${user.telefonoFormateado || user.telefono || '-'}</span>
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
    contenedor.innerHTML = '<p class="error-text">Error al cargar clientes: ' + error.message + '</p>';
  }
}
