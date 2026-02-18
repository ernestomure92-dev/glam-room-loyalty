// ==========================================
// ADMIN - Panel de Administración
// ==========================================

let currentAdmin = null;
let currentAdminClient = null;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar auth
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentAdmin = user;
            document.getElementById('adminLoginScreen').classList.remove('active');
            document.getElementById('adminDashboard').classList.add('active');
            document.getElementById('adminUserEmail').textContent = user.email;
            loadDashboard();
        } else {
            document.getElementById('adminLoginScreen').classList.add('active');
            document.getElementById('adminDashboard').classList.remove('active');
        }
    });
});

async function loginAdmin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

function logoutAdmin() {
    firebase.auth().signOut();
}

// ... resto de funciones de admin (loadDashboard, searchClient, etc.)
// Puedes copiarlas de tu archivo anterior
