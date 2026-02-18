// Variables globales
let currentClient = null;
let currentAdminClient = null;

// Navegación
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenName + 'Screen').classList.add('active');
}

// Login cliente
async function login() {
    const phone = document.getElementById('phoneInput').value.trim();
    
    if (phone.length !== 10) {
        showNotification('Ingresa un número de 10 dígitos', 'error');
        return;
    }

    try {
        const doc = await clientsCollection.doc(phone).get();
        
        if (doc.exists) {
            currentClient = { id: phone, ...doc.data() };
            loadClientCard();
            showScreen('card');
        } else {
            showNotification('Cliente no encontrado. Contacta al estudio.', 'error');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    }
}

// Cargar tarjeta del cliente
function loadClientCard() {
    document.getElementById('clientName').textContent = currentClient.name;
    
    const totalStars = currentClient.totalStars || currentClient.stars || 0;
    const currentStars = currentClient.stars || 0;
    
    // Determinar nivel
    let tier = TIERS.bronze;
    let maxStars = 10;
        // Agregar botón de citas si no existe
    if (!document.getElementById('btnAppointments')) {
        const btnContainer = document.createElement('div');
        btnContainer.style.marginTop = '20px';
        btnContainer.innerHTML = `
            <button onclick="showMyAppointments()" class="btn-secondary" style="width: 100%; margin-bottom: 10px;">
                <i class="fas fa-calendar-alt"></i> Ver mis citas
            </button>
            <button onclick="initAppointmentBooking('${currentClient.id}', '${currentClient.name}')" class="btn-primary" style="width: 100%;">
                <i class="fas fa-calendar-plus"></i> Agendar nueva cita
            </button>
        `;
        document.querySelector('.card-content').appendChild(btnContainer);
    }
}    
    if (totalStars >= 50) {
        tier = TIERS.diamond;
        maxStars = '∞';
    } else if (totalStars >= 25) {
        tier = TIERS.gold;
        maxStars = 25;
    } else if (totalStars >= 10) {
        tier = TIERS.silver;
        maxStars = 25;
    }
    
    // Actualizar badge de nivel
    const badge = document.getElementById('tierBadge');
    badge.textContent = `Nivel: ${tier.name} ${tier.name === 'Diamante' ? '💎' : '✨'}`;
    badge.className = `tier-badge ${tier.name.toLowerCase()}`;
    
    // Generar estrellas (máximo 10 visibles por tarjeta)
    const container = document.getElementById('starsContainer');
    container.innerHTML = '';
    
    const starsToShow = Math.min(currentStars, 10);
    for (let i = 0; i < 10; i++) {
        const star = document.createElement('div');
        star.className = 'star' + (i < starsToShow ? ' active' : '');
        container.appendChild(star);
    }
    
    // Actualizar progreso
    document.getElementById('currentStars').textContent = currentStars;
    document.getElementById('maxStars').textContent = maxStars;
    
    // Próxima recompensa
    const nextReward = document.getElementById('nextReward');
    if (currentStars < 10) {
        nextReward.innerHTML = `Próxima recompensa: <span>${tier.reward}</span>`;
        nextReward.style.display = 'block';
    } else {
        nextReward.style.display = 'none';
    }
    
    // Mostrar estado de recompensa lista
    const rewardStatus = document.getElementById('rewardStatus');
    if (currentStars >= 10) {
        rewardStatus.classList.add('show');
    } else {
        rewardStatus.classList.remove('show');
    }
    
    // Actualizar niveles visuales
    document.querySelectorAll('.level-item').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.tier === tier.name.toLowerCase()) {
            el.classList.add('active');
        }
    });
    
    loadHistory();
}

function loadHistory() {
    const list = document.getElementById('visitHistory');
    list.innerHTML = '';
    
    if (currentClient.visits && currentClient.visits.length > 0) {
        const visits = [...currentClient.visits].reverse().slice(0, 10);
        
        visits.forEach(visit => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span><i class="fas fa-star" style="color: var(--gold)"></i> Visita registrada</span>
                <span class="history-date">${formatDate(visit.date)}</span>
            `;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li class="history-item">Sin visitas registradas aún</li>';
    }
}

function logout() {
    currentClient = null;
    document.getElementById('phoneInput').value = '';
    showScreen('login');
}

// Funciones Admin
async function searchClient() {
    const phone = document.getElementById('adminPhoneInput').value.trim();
    
    if (phone.length !== 10) {
        showNotification('Ingresa un número válido', 'error');
        return;
    }

    try {
        const doc = await clientsCollection.doc(phone).get();
        
        if (doc.exists) {
            currentAdminClient = { id: phone, ...doc.data() };
            showAdminClientInfo();
        } else {
            showNotification('Cliente no encontrado', 'error');
            document.getElementById('adminClientInfo').classList.add('hidden');
        }
    } catch (error) {
        showNotification('Error de conexión', 'error');
    }
}

function showAdminClientInfo() {
    const client = currentAdminClient;
    const totalStars = client.totalStars || client.stars || 0;
    const currentStars = client.stars || 0;
    
    // Determinar nivel
    let tier = TIERS.bronze;
    if (totalStars >= 50) tier = TIERS.diamond;
    else if (totalStars >= 25) tier = TIERS.gold;
    else if (totalStars >= 10) tier = TIERS.silver;
    
    document.getElementById('adminClientName').textContent = client.name;
    document.getElementById('adminClientPhone').textContent = client.id;
    document.getElementById('adminClientTier').textContent = tier.name;
    document.getElementById('adminClientTier').style.background = tier.color;
    
    document.getElementById('adminClientTotalStars').textContent = totalStars;
    document.getElementById('adminClientCurrentStars').textContent = currentStars;
    
    // Barra de progreso
    const progress = (currentStars / 10) * 100;
    document.getElementById('clientProgressBar').style.width = Math.min(progress, 100) + '%';
    document.getElementById('progressText').textContent = `${currentStars}/10`;
    
    // Botón de canjear
    const redeemBtn = document.getElementById('redeemBtn');
    if (currentStars >= 10) {
        redeemBtn.classList.remove('hidden');
    } else {
        redeemBtn.classList.add('hidden');
    }
    
    // Historial admin
    const historyList = document.getElementById('adminClientHistory');
    historyList.innerHTML = '';
    
    if (client.visits) {
        [...client.visits].reverse().forEach(visit => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span>${visit.type === 'reward' ? '🎁 Recompensa' : '⭐ Visita'}</span>
                <span class="history-date">${formatDate(visit.date)}</span>
            `;
            historyList.appendChild(li);
        });
    }
    
    document.getElementById('adminClientInfo').classList.remove('hidden');
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
        await clientsCollection.doc(currentAdminClient.id).update({
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
        
        // Verificar si completó tarjeta
        if (newStars === 10) {
            showNotification('🎉 ¡Cliente completó su tarjeta!', 'success');
            // Opcional: Enviar WhatsApp automático
            // whatsAppService.sendRewardNotification(currentAdminClient.id, currentAdminClient.name, 'Recompensa');
        } else {
            showNotification('⭐ Visita agregada correctamente', 'success');
        }
        
        await logActivity('visit', `Nueva visita: ${currentAdminClient.name}`, currentAdminClient.id);
        showAdminClientInfo();
        loadDashboard(); // Actualizar stats
    } catch (error) {
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
        
        await clientsCollection.doc(currentAdminClient.id).update({
            stars: 0,
            rewards: firebase.firestore.FieldValue.arrayUnion(reward),
            lastReward: new Date().toISOString()
        });
        
        currentAdminClient.stars = 0;
        
        await logActivity('redemption', `Recompensa canjeada: ${currentAdminClient.name}`, currentAdminClient.id);
        showNotification('🎁 Recompensa canjeada exitosamente', 'success');
        showAdminClientInfo();
        loadDashboard();
    } catch (error) {
        showNotification('Error al canjear', 'error');
    }
}

// Gestión de nuevos clientes
function showNewClientForm() {
    document.getElementById('newClientForm').classList.remove('hidden');
    document.getElementById('adminClientInfo').classList.add('hidden');
}

function hideNewClientForm() {
    document.getElementById('newClientForm').classList.add('hidden');
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientEmail').value = '';
}

async function createClient() {
    const name = document.getElementById('newClientName').value.trim();
    const phone = document.getElementById('newClientPhone').value.trim();
    const email = document.getElementById('newClientEmail').value.trim();
    
    if (!name || phone.length !== 10) {
        showNotification('Completa los campos obligatorios', 'error');
        return;
    }

    try {
        const doc = await clientsCollection.doc(phone).get();
        
        if (doc.exists) {
            showNotification('Este número ya está registrado', 'error');
            return;
        }
        
        await clientsCollection.doc(phone).set({
            name: name,
            email: email || null,
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
        
        await logActivity('new_client', `Nuevo cliente registrado: ${name}`, phone);
        showNotification('✨ Cliente creado exitosamente', 'success');
        hideNewClientForm();
        
        // Buscar el cliente recién creado
        document.getElementById('adminPhoneInput').value = phone;
        searchClient();
    } catch (error) {
        showNotification('Error al crear cliente', 'error');
    }
}

// Utilidades
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
    notif.textContent = message;
    notif.className = 'notification ' + type;
    notif.classList.add('show');
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('phoneInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('adminPhoneInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchClient();
    });
});
