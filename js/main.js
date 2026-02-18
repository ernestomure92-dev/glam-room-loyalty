// ==========================================
// MAIN - Página Principal
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        showScreen('card');
        loadClientCard();
    }
    
    document.getElementById('phoneInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
});

async function login() {
    const phone = document.getElementById('phoneInput').value.trim();
    
    if (phone.length !== 10) {
        showNotification('Ingresa un número de 10 dígitos', 'error');
        return;
    }

    const success = await loadClient(phone);
    
    if (success) {
        saveSession(phone);
        showScreen('card');
        loadClientCard();
    } else {
        showNotification('Cliente no encontrado. Contacta al estudio.', 'error');
    }
}

function loadClientCard() {
    if (!currentClient) return;
    
    document.getElementById('clientName').textContent = currentClient.name;
    
    const totalStars = currentClient.totalStars || currentClient.stars || 0;
    const currentStars = currentClient.stars || 0;
    
    let tier = TIERS.bronze;
    let maxStars = 10;
    
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
    
    const badge = document.getElementById('tierBadge');
    badge.textContent = `Nivel: ${tier.name} ${tier.name === 'Diamante' ? '💎' : '✨'}`;
    badge.className = `tier-badge ${tier.name.toLowerCase()}`;
    
    const container = document.getElementById('starsContainer');
    container.innerHTML = '';
    
    const starsToShow = Math.min(currentStars, 10);
    for (let i = 0; i < 10; i++) {
        const star = document.createElement('div');
        star.className = 'star' + (i < starsToShow ? ' active' : '');
        container.appendChild(star);
    }
    
    document.getElementById('currentStars').textContent = currentStars;
    document.getElementById('maxStars').textContent = maxStars;
    
    const nextReward = document.getElementById('nextReward');
    if (currentStars < 10) {
        nextReward.innerHTML = `Próxima recompensa: <span>${tier.reward}</span>`;
        nextReward.style.display = 'block';
    } else {
        nextReward.style.display = 'none';
    }
    
    const rewardStatus = document.getElementById('rewardStatus');
    if (currentStars >= 10) {
        rewardStatus.classList.add('show');
    } else {
        rewardStatus.classList.remove('show');
    }
    
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
    if (!list || !currentClient) return;
    
    list.innerHTML = '';
    
    if (currentClient.visits && currentClient.visits.length > 0) {
        const visits = [...currentClient.visits].reverse().slice(0, 10);
        
        visits.forEach(visit => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span><i class="fas fa-star" style="color: var(--gold)"></i> Visita</span>
                <span class="history-date">${formatDate(visit.date)}</span>
            `;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li class="history-item">Sin visitas registradas</li>';
    }
}

function logout() {
    clearSession();
    document.getElementById('phoneInput').value = '';
    showScreen('login');
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenName + 'Screen');
    if (screen) screen.classList.add('active');
}
