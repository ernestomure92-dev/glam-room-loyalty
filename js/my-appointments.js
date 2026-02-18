// ==========================================
// MY APPOINTMENTS - Ver mis citas
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = await checkSession();
    
    if (!isLoggedIn) {
        document.getElementById('myAppointmentsScreen').classList.add('hidden');
        document.getElementById('loginPrompt').classList.remove('hidden');
        return;
    }
    
    loadMyAppointments();
});

async function loadMyAppointments() {
    const list = document.getElementById('appointmentsList');
    list.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
    
    try {
        const today = DateUtils.toISOString(new Date());
        
        const snapshot = await db.collection('appointments')
            .where('clientId', '==', currentClient.id)
            .where('date', '>=', today)
            .get();
        
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        
        appointments.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });
        
        if (appointments.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 4rem; color: var(--light-pink); margin-bottom: 20px;"></i>
                    <p>No tienes citas próximas</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = appointments.map(apt => `
            <div class="appointment-card">
                <div class="appointment-info">
                    <h4>${apt.serviceName}</h4>
                    <p><i class="fas fa-calendar"></i> ${DateUtils.formatDisplay(apt.date)}</p>
                    <p><i class="fas fa-clock"></i> ${apt.time}</p>
                </div>
                <div class="appointment-status">
                    <span class="badge confirmed">✓ Confirmada</span>
                    <button onclick="cancelAppointment('${apt.id}')" class="btn-cancel">
                        Cancelar
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        list.innerHTML = '<p>Error al cargar citas</p>';
    }
}

async function cancelAppointment(id) {
    if (!confirm('¿Cancelar esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(id).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
        
        showNotification('Cita cancelada', 'success');
        loadMyAppointments();
        
    } catch (error) {
        showNotification('Error al cancelar', 'error');
    }
}
