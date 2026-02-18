// ==========================================
// ADMIN - Panel de Administración Completo
// ==========================================

let currentAdmin = null;
let currentAdminClient = null;
let visitsChartInstance = null;
let tiersChartInstance = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Verificar estado de autenticación
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentAdmin = user;
            showAdminDashboard();
        } else {
            showAdminLogin();
        }
    });
    
    // Event listeners
    document.getElementById('adminEmail')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginAdmin();
    });
    
    document.getElementById('adminPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginAdmin();
    });
    
    document.getElementById('searchPhone')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchClient();
    });
    
    // Set fecha de hoy en el filtro de citas
    const today = new Date().toISOString().split('T')[0];
    const dateFilter = document.getElementById('adminDateFilter');
    if (dateFilter) {
        dateFilter.value = today;
    }
});

function showAdminLogin() {
    document.getElementById('adminLoginScreen').classList.add('active');
    document.getElementById('adminDashboard').classList.remove('active');
}

function showAdminDashboard() {
    document.getElementById('adminLoginScreen').classList.remove('active');
    document.getElementById('adminDashboard').classList.add('active');
    document.getElementById('adminUserEmail').textContent = currentAdmin.email;
    
    // Cargar dashboard inicial
    loadDashboard();
}

async function loginAdmin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showNotification('Ingresa correo y contraseña', 'error');
        return;
    }

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showNotification('¡Bienvenido!', 'success');
    } catch (error) {
        let message = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
        if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
        if (error.code === 'auth/invalid-email') message = 'Correo inválido';
        showNotification(message, 'error');
    }
}

function logoutAdmin() {
    firebase.auth().signOut().then(() => {
        showNotification('Sesión cerrada', 'success');
    });
}

// ==========================================
// DASHBOARD - Estadísticas
// ==========================================

async function loadDashboard() {
    await Promise.all([
        loadStats(),
        loadCharts(),
        loadRecentActivity()
    ]);
}

async function loadStats() {
    try {
        const clientsSnapshot = await db.collection('clients').get();
        const totalClients = clientsSnapshot.size;
        
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let totalVisits = 0;
        let pendingRewards = 0;
        let vipClients = 0;
        
        clientsSnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.visits) {
                const monthVisits = data.visits.filter(v => 
                    new Date(v.date) >= firstDayOfMonth
                ).length;
                totalVisits += monthVisits;
            }
            
            if (data.stars >= 10) pendingRewards++;
            if ((data.totalStars || 0) >= 50) vipClients++;
        });
        
        document.getElementById('totalClients').textContent = totalClients;
        document.getElementById('totalVisits').textContent = totalVisits;
        document.getElementById('pendingRewards').textContent = pendingRewards;
        document.getElementById('vipClients').textContent = vipClients;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error al cargar estadísticas', 'error');
    }
}

async function loadCharts() {
    try {
        const clientsSnapshot = await db.collection('clients').get();
        
        const visitsByWeek = [0, 0, 0, 0];
        const tierCounts = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
        
        const now = new Date();
        
        clientsSnapshot.forEach(doc => {
            const data = doc.data();
            const totalStars = data.totalStars || data.stars || 0;
            
            if (totalStars >= 50) tierCounts.diamond++;
            else if (totalStars >= 25) tierCounts.gold++;
            else if (totalStars >= 10) tierCounts.silver++;
            else tierCounts.bronze++;
            
            if (data.visits) {
                data.visits.forEach(visit => {
                    const visitDate = new Date(visit.date);
                    const weekDiff = Math.floor((now - visitDate) / (7 * 24 * 60 * 60 * 1000));
                    if (weekDiff >= 0 && weekDiff < 4) {
                        visitsByWeek[3 - weekDiff]++;
                    }
                });
            }
        });
        
        // Gráfico de visitas
        const visitsCtx = document.getElementById('visitsChart');
        if (visitsCtx) {
            if (visitsChartInstance) visitsChartInstance.destroy();
            
            visitsChartInstance = new Chart(visitsCtx, {
                type: 'line',
                data: {
                    labels: ['Hace 3 sem', 'Hace 2 sem', 'Semana pasada', 'Esta semana'],
                    datasets: [{
                        label: 'Visitas',
                        data: visitsByWeek,
                        borderColor: '#ff69b4',
                        backgroundColor: 'rgba(255, 105, 180, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
        
        // Gráfico de niveles
        const tiersCtx = document.getElementById('tiersChart');
        if (tiersCtx) {
            if (tiersChartInstance) tiersChartInstance.destroy();
            
            tiersChartInstance = new Chart(tiersCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Bronce', 'Plata', 'Oro', 'Diamante'],
                    datasets: [{
                        data: [tierCounts.bronze, tierCounts.silver, tierCounts.gold, tierCounts.diamond],
                        backgroundColor: ['#cd7f32', '#c0c0c0', '#ffd700', '#b9f2ff'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
        
    } catch (error) {
        console.error('Error cargando gráficos:', error);
    }
}

async function loadRecentActivity() {
    try {
        const snapshot = await db.collection('activity')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const list = document.getElementById('recentActivityList');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (snapshot.empty) {
            list.innerHTML = '<li class="activity-item">Sin actividad reciente</li>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.className = 'activity-item';
            li.innerHTML = `
                <div>
                    <i class="fas ${getActivityIcon(data.type)}"></i>
                    <span>${data.description}</span>
                </div>
                <span class="activity-time">${formatTimeAgo(data.timestamp)}</span>
            `;
            list.appendChild(li);
        });
        
    } catch (error) {
        console.error('Error cargando actividad:', error);
    }
}

function getActivityIcon(type) {
    const icons = {
        visit: 'fa-star',
        reward: 'fa-gift',
        new_client: 'fa-user-plus',
        redemption: 'fa-check-circle',
        appointment: 'fa-calendar-check'
    };
    return icons[type] || 'fa-info-circle';
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} horas`;
    return date.toLocaleDateString('es-MX');
}

async function logActivity(type, description, clientId = null) {
    try {
        await db.collection('activity').add({
            type,
            description,
            clientId,
            timestamp: new Date().toISOString(),
            admin: currentAdmin ? currentAdmin.email : 'sistema'
        });
    } catch (error) {
        console.error('Error registrando actividad:', error);
    }
}

// ==========================================
// GESTIÓN DE CLIENTES - CORREGIDO
// ==========================================

async function searchClient() {
    const phone = document.getElementById('searchPhone').value.trim();
    
    if (phone.length !== 10) {
        showNotification('Ingresa un número de 10 dígitos', 'error');
        return;
    }

    try {
        const doc = await db.collection('clients').doc(phone).get();
        
        if (doc.exists) {
            currentAdminClient = { id: phone, ...doc.data() };
            showClientInfo();
        } else {
            showNotification('Cliente no encontrado', 'error');
            hideClientInfo();
        }
    } catch (error) {
        console.error('Error buscando cliente:', error);
        showNotification('Error de conexión', 'error');
    }
}

// CORREGIDO: Usar innerHTML para evitar duplicados
function showClientInfo() {
    const client = currentAdminClient;
    const totalStars = client.totalStars || client.stars || 0;
    const currentStars = client.stars || 0;
    
    let tier = TIERS.bronze;
    if (totalStars >= 50) tier = TIERS.diamond;
    else if (totalStars >= 25) tier = TIERS.gold;
    else if (totalStars >= 10) tier = TIERS.silver;
    
    const clientInfoDiv = document.getElementById('clientInfo');
    clientInfoDiv.classList.remove('hidden');
    document.getElementById('newClientForm').classList.add('hidden');
    
    // LIMPIAR Y RECREAR TODO EL CONTENIDO (EVITA DUPLICADOS)
    clientInfoDiv.innerHTML = `
        <div class="client-header">
            <div>
                <h3>${client.name}</h3>
                <span class="phone-tag">${client.id}</span>
                <span class="tier-tag" style="background: ${tier.color}">${tier.name}</span>
            </div>
            <div class="client-stats">
                <div class="stat">
                    <span>${totalStars}</span>
                    <small>Total</small>
                </div>
                <div class="stat">
                    <span>${currentStars}</span>
                    <small>Actual</small>
                </div>
            </div>
        </div>
        
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${Math.min((currentStars / 10) * 100, 100)}%"></div>
            <span>${currentStars}/10</span>
        </div>
        
        <div class="admin-actions">
            <button onclick="addStar()" class="btn-primary">
                <i class="fas fa-plus"></i> Agregar Visita
            </button>
            ${currentStars >= 10 ? `
                <button onclick="redeemReward()" class="btn-reward">
                    <i class="fas fa-gift"></i> Canjear Recompensa
                </button>
            ` : ''}
            <button onclick="notifyClient()" class="btn-whatsapp">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </button>
        </div>
        
        <h5 style="margin: 25px 0 15px; color: var(--dark-pink); font-family: 'Playfair Display', serif;">Historial</h5>
        <ul class="history-list">
            ${client.visits && client.visits.length > 0 ? 
                [...client.visits].reverse().map(visit => `
                    <li class="history-item">
                        <span>${visit.type === 'reward' ? '🎁 Recompensa' : '⭐ Visita'}</span>
                        <span class="history-date">${formatDate(visit.date)}</span>
                    </li>
                `).join('') : 
                '<li class="history-item">Sin historial</li>'
            }
        </ul>
    `;
}

function hideClientInfo() {
    document.getElementById('clientInfo').classList.add('hidden');
}

function showNewClientForm() {
    document.getElementById('newClientForm').classList.remove('hidden');
    document.getElementById('clientInfo').classList.add('hidden');
}

function hideNewClientForm() {
    document.getElementById('newClientForm').classList.add('hidden');
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientPhone').value = '';
}

async function createClient() {
    const name = document.getElementById('newClientName').value.trim();
    const phone = document.getElementById('newClientPhone').value.trim();
    
    if (!name || phone.length !== 10) {
        showNotification('Completa los campos correctamente', 'error');
        return;
    }

    try {
        const doc = await db.collection('clients').doc(phone).get();
        
        if (doc.exists) {
            showNotification('Este número ya está registrado', 'error');
            return;
        }
        
        await db.collection('clients').doc(phone).set({
            name: name,
            phone: phone,
            stars: 0,
            totalStars: 0,
            visits: [],
            rewards: [],
            tier: 'bronze',
            createdAt: new Date().toISOString(),
            lastVisit: null,
            updatedAt: new Date().toISOString()
        });
        
        await logActivity('new_client', `Nuevo cliente: ${name}`, phone);
        showNotification('✨ Cliente creado exitosamente', 'success');
        hideNewClientForm();
        
        // Buscar el nuevo cliente
        document.getElementById('searchPhone').value = phone;
        await searchClient();
        
    } catch (error) {
        console.error('Error creando cliente:', error);
        showNotification('Error al crear cliente', 'error');
    }
}

async function addStar() {
    if (!currentAdminClient) return;
    
    const newStars = (currentAdminClient.stars || 0) + 1;
    const newTotalStars = (currentAdminClient.totalStars || currentAdminClient.stars || 0) + 1;
    
    const visit = {
        date: new Date().toISOString(),
        type: 'visit'
    };
    
    try {
        await db.collection('clients').doc(currentAdminClient.id).update({
            stars: newStars,
            totalStars: newTotalStars,
            visits: firebase.firestore.FieldValue.arrayUnion(visit),
            lastVisit: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        currentAdminClient.stars = newStars;
        currentAdminClient.totalStars = newTotalStars;
        if (!currentAdminClient.visits) currentAdminClient.visits = [];
        currentAdminClient.visits.push(visit);
        
        if (newStars === 10) {
            showNotification('🎉 ¡Cliente completó su tarjeta!', 'success');
        } else {
            showNotification('⭐ Visita agregada', 'success');
        }
        
        await logActivity('visit', `Visita: ${currentAdminClient.name}`, currentAdminClient.id);
        showClientInfo();
        loadDashboard();
        
    } catch (error) {
        console.error('Error agregando estrella:', error);
        showNotification('Error al guardar', 'error');
    }
}

async function redeemReward() {
    if (!currentAdminClient || currentAdminClient.stars < 10) return;
    
    try {
        const reward = {
            date: new Date().toISOString(),
            type: 'reward',
            redeemed: true
        };
        
        await db.collection('clients').doc(currentAdminClient.id).update({
            stars: 0,
            rewards: firebase.firestore.FieldValue.arrayUnion(reward),
            lastReward: new Date().toISOString()
        });
        
        currentAdminClient.stars = 0;
        
        await logActivity('redemption', `Recompensa: ${currentAdminClient.name}`, currentAdminClient.id);
        showNotification('🎁 Recompensa canjeada', 'success');
        showClientInfo();
        loadDashboard();
        
    } catch (error) {
        console.error('Error canjeando:', error);
        showNotification('Error al canjear', 'error');
    }
}

function notifyClient() {
    if (!currentAdminClient) return;
    
    const phone = currentAdminClient.id;
    const totalStars = currentAdminClient.totalStars || currentAdminClient.stars || 0;
    
    let tier = TIERS.bronze;
    if (totalStars >= 50) tier = TIERS.diamond;
    else if (totalStars >= 25) tier = TIERS.gold;
    else if (totalStars >= 10) tier = TIERS.silver;
    
    const message = `¡Hola ${currentAdminClient.name}! 🎉\n\n` +
        `Has completado tu tarjeta en *Glam Room*!\n\n` +
        `🎁 Recompensa: ${tier.reward}\n` +
        `👑 Nivel: ${tier.name}\n\n` +
        `¡Te esperamos! 💅`;
    
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/52${phone}?text=${encodedMsg}`, '_blank');
    
    showNotification('Abriendo WhatsApp...', 'success');
}

// ==========================================
// GESTIÓN DE CITAS (ADMIN) - CORREGIDO
// ==========================================

async function loadAdminAppointments() {
    const dateFilter = document.getElementById('adminDateFilter').value;
    const list = document.getElementById('adminAppointmentsList');
    
    if (!list) return;
    
    list.innerHTML = '<p>Cargando...</p>';
    
    try {
        const snapshot = await db.collection('appointments')
            .where('date', '==', dateFilter)
            .get();
        
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        
        appointments.sort((a, b) => a.time.localeCompare(b.time));
        
        if (appointments.length === 0) {
            list.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No hay citas para esta fecha</p>';
            return;
        }
        
        list.innerHTML = appointments.map(apt => {
            const isCancelled = apt.status === 'cancelled';
            
            return `
            <div class="appointment-card" style="background: white; padding: 20px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); ${isCancelled ? 'opacity: 0.6;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="color: var(--dark-pink); margin-bottom: 8px; ${isCancelled ? 'text-decoration: line-through;' : ''}">
                            ${apt.serviceName}
                        </h4>
                        <p style="color: #666; margin: 4px 0;"><i class="fas fa-user"></i> ${apt.clientName}</p>
                        <p style="color: #666; margin: 4px 0;"><i class="fas fa-clock"></i> ${apt.time}</p>
                        <p style="color: #666; margin: 4px 0;"><i class="fas fa-phone"></i> ${apt.phone}</p>
                        ${isCancelled ? '<p style="color: #e74c3c; font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-ban"></i> Cancelada</p>' : ''}
                    </div>
                    <div style="text-align: right;">
                        <span class="badge ${apt.status}" style="display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; margin-bottom: 10px; ${apt.status === 'confirmed' ? 'background: #e8f5e9; color: #2e7d32;' : apt.status === 'cancelled' ? 'background: #ffebee; color: #c62828;' : 'background: #fff3e0; color: #ef6c00;'}">
                            ${apt.status === 'confirmed' ? '✓ Confirmada' : apt.status === 'cancelled' ? '✕ Cancelada' : '⏳ Pendiente'}
                        </span>
                        <div style="display: flex; gap: 5px; flex-direction: column;">
                            ${!isCancelled ? `
                                <button onclick="cancelAdminAppointment('${apt.id}')" class="btn-cancel" style="padding: 6px 12px; font-size: 0.8rem;">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            ` : ''}
                            <button onclick="deleteAppointment('${apt.id}')" class="btn-cancel" style="padding: 6px 12px; font-size: 0.8rem; background: #ffebee; color: #c62828;">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        list.innerHTML = '<p style="color: #e74c3c; text-align: center;">Error al cargar citas</p>';
    }
}

// NUEVAS FUNCIONES: Cancelar y Eliminar citas desde admin
async function cancelAdminAppointment(appointmentId) {
    if (!confirm('¿Cancelar esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(appointmentId).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'admin'
        });
        
        showNotification('Cita cancelada', 'success');
        loadAdminAppointments();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cancelar', 'error');
    }
}

async function deleteAppointment(appointmentId) {
    if (!confirm('¿Eliminar permanentemente esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(appointmentId).delete();
        showNotification('Cita eliminada', 'success');
        loadAdminAppointments();
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar', 'error');
    }
}

// ==========================================
// NAVEGACIÓN DE TABS
// ==========================================

function showTab(tabName) {
    // Ocultar todas las tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar tab seleccionada
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Activar botón que disparó el evento
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Cargar contenido específico
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'appointments') {
        loadAdminAppointments();
    }
}

// ==========================================
// UTILIDADES
// ==========================================

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
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

// Crear admin inicial (ejecutar en consola una vez)
function createAdmin(email, password) {
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(() => alert('Admin creado'))
        .catch(e => alert('Error: ' + e.message));
}
