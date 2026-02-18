// ==========================================
// UTILIDADES COMPARTIDAS
// ==========================================

// Variables globales
let currentClient = null;

// Verificar sesión al cargar
function checkSession() {
    const savedPhone = sessionStorage.getItem('glamRoomClient');
    if (savedPhone) {
        return loadClient(savedPhone);
    }
    return Promise.resolve(false);
}

async function loadClient(phone) {
    try {
        const doc = await db.collection('clients').doc(phone).get();
        if (doc.exists) {
            currentClient = { id: phone, ...doc.data() };
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error cargando cliente:', error);
        return false;
    }
}

function saveSession(phone) {
    sessionStorage.setItem('glamRoomClient', phone);
}

function clearSession() {
    sessionStorage.removeItem('glamRoomClient');
    currentClient = null;
}

// Notificaciones
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

// Formatear fecha
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Navegación suave
function navigateTo(url) {
    window.location.href = url;
}

// Utilidades de fecha
const DateUtils = {
    toISOString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    formatDisplay(dateString) {
        return new Date(dateString + 'T00:00:00').toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};
