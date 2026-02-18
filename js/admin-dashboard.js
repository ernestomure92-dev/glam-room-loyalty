// Dashboard de estadísticas
let visitsChartInstance = null;
let tiersChartInstance = null;

async function loadDashboard() {
    await Promise.all([
        loadStats(),
        loadCharts(),
        loadRecentActivity()
    ]);
}

async function loadStats() {
    try {
        // Total clientes
        const clientsSnapshot = await clientsCollection.get();
        const totalClients = clientsSnapshot.size;
        
        // Calcular visitas del mes actual
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let totalVisits = 0;
        let pendingRewards = 0;
        let vipClients = 0;
        
        clientsSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Contar visitas del mes
            if (data.visits) {
                const monthVisits = data.visits.filter(v => 
                    new Date(v.date) >= firstDayOfMonth
                ).length;
                totalVisits += monthVisits;
            }
            
            // Recompensas pendientes (stars >= 10)
            if (data.stars >= 10) pendingRewards++;
            
            // Clientes VIP (Diamante = 50+ estrellas totales)
            if (data.totalStars >= 50) vipClients++;
        });
        
        // Actualizar UI
        document.getElementById('totalClients').textContent = totalClients;
        document.getElementById('totalVisits').textContent = totalVisits;
        document.getElementById('pendingRewards').textContent = pendingRewards;
        document.getElementById('vipClients').textContent = vipClients;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadCharts() {
    const clientsSnapshot = await clientsCollection.get();
    
    // Datos para gráfico de visitas por semana
    const visitsByWeek = [0, 0, 0, 0]; // 4 semanas
    const tierCounts = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
    
    const now = new Date();
    
    clientsSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Contar por niveles
        if (data.totalStars >= 50) tierCounts.diamond++;
        else if (data.totalStars >= 25) tierCounts.gold++;
        else if (data.totalStars >= 10) tierCounts.silver++;
        else tierCounts.bronze++;
        
        // Visitas por semana del mes actual
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
    const visitsCtx = document.getElementById('visitsChart').getContext('2d');
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
    
    // Gráfico de distribución de niveles
    const tiersCtx = document.getElementById('tiersChart').getContext('2d');
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
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function loadRecentActivity() {
    const activitySnapshot = await activityCollection
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
    
    const list = document.getElementById('recentActivityList');
    list.innerHTML = '';
    
    activitySnapshot.forEach(doc => {
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
}

function getActivityIcon(type) {
    const icons = {
        visit: 'fa-star',
        reward: 'fa-gift',
        new_client: 'fa-user-plus',
        redemption: 'fa-check-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // segundos
    
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff/3600)} horas`;
    return date.toLocaleDateString('es-MX');
}

// Registrar actividad
async function logActivity(type, description, clientId = null) {
    await activityCollection.add({
        type,
        description,
        clientId,
        timestamp: new Date().toISOString(),
        admin: currentAdmin ? currentAdmin.email : 'sistema'
    });
}

// Navegación tabs
function showDashboard() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    document.getElementById('dashboardTab').classList.add('active');
    event.target.classList.add('active');
    loadDashboard();
}

function showClients() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
    document.getElementById('clientsTab').classList.add('active');
    event.target.classList.add('active');
}
