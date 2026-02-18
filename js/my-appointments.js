// ==========================================
// MY APPOINTMENTS - Ver mis citas (CORREGIDO)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadMyAppointments();
});

async function loadMyAppointments() {
    const list = document.getElementById('appointmentsList');
    if (!list) return;
    
    // Verificar sesión
    const savedPhone = sessionStorage.getItem('glamRoomClient');
    if (!savedPhone) {
        document.getElementById('myAppointmentsScreen')?.classList.add('hidden');
        document.getElementById('loginPrompt')?.classList.remove('hidden');
        return;
    }
    
    list.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
    
    try {
        // Cargar TODAS las citas del cliente (incluyendo canceladas)
        const snapshot = await db.collection('appointments')
            .where('clientId', '==', savedPhone)
            .get();
        
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordenar: primero activas por fecha, luego canceladas
        appointments.sort((a, b) => {
            if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
            if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });
        
        if (appointments.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 4rem; color: var(--light-pink); margin-bottom: 20px;"></i>
                    <p>No tienes citas</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = appointments.map(apt => {
            const isCancelled = apt.status === 'cancelled';
            const isPast = new Date(apt.date + 'T' + apt.time) < new Date();
            
            return `
            <div class="appointment-card" style="background: white; border-radius: 20px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); ${isCancelled ? 'opacity: 0.6;' : ''}">
                <div class="appointment-info">
                    <h4 style="color: var(--dark-pink); margin-bottom: 8px; ${isCancelled ? 'text-decoration: line-through;' : ''}">
                        ${apt.serviceName}
                    </h4>
                    <p style="color: #666; margin: 4px 0;">
                        <i class="fas fa-calendar"></i> ${formatDisplayDate(apt.date)}
                    </p>
                    <p style="color: #666; margin: 4px 0;">
                        <i class="fas fa-clock"></i> ${apt.time}
                    </p>
                    <p style="color: #666; margin: 4px 0;">
                        <i class="fas fa-hourglass-half"></i> ${apt.duration} min
                    </p>
                    ${isCancelled ? '<p style="color: #e74c3c; margin-top: 8px;"><i class="fas fa-ban"></i> Cancelada</p>' : ''}
                </div>
                <div class="appointment-status" style="text-align: right;">
                    <span class="badge ${apt.status}" style="display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-bottom: 10px; ${apt.status === 'confirmed' ? 'background: #e8f5e9; color: #2e7d32;' : isCancelled ? 'background: #ffebee; color: #c62828;' : 'background: #fff3e0; color: #ef6c00;'}">
                        ${apt.status === 'confirmed' ? '✓ Confirmada' : isCancelled ? '✕ Cancelada' : '⏳ Pendiente'}
                    </span>
                    ${!isCancelled && !isPast ? `
                        <button onclick="cancelAppointment('${apt.id}')" class="btn-cancel" style="display: block; margin-top: 5px;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    ` : ''}
                </div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('Error:', error);
        list.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error al cargar citas</p>';
    }
}

// CORREGIDO: Función de cancelar con mejor manejo de errores
async function cancelAppointment(id) {
    if (!confirm('¿Segura que quieres cancelar esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(id).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'client'
        });
        
        showNotification('Cita cancelada correctamente', 'success');
        loadMyAppointments(); // Recargar la lista
        
    } catch (error) {
        console.error('Error cancelando:', error);
        showNotification('Error al cancelar: ' + error.message, 'error');
    }
}

function formatDisplayDate(dateString) {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    if (!notif) return;
    
    notif.textContent = message;
    notif.className = 'notification ' + type;
    notif.classList.add('show');
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}
