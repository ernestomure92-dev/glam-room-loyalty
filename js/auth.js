// ==========================================
// AUTENTICACIÓN ADMINISTRADOR
// ==========================================

let currentAdmin = null;

// Verificar estado de auth al cargar
auth.onAuthStateChanged((user) => {
    if (user) {
        currentAdmin = user;
        if (document.getElementById('adminScreen')) {
            showScreen('admin');
            loadDashboard();
            document.getElementById('adminUserEmail').textContent = user.email;
        }
    } else {
        currentAdmin = null;
    }
});

function showAdminLogin() {
    document.getElementById('adminLoginModal').classList.remove('hidden');
}

function closeAdminLogin() {
    document.getElementById('adminLoginModal').classList.add('hidden');
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
}

async function loginAdmin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showNotification('Ingresa correo y contraseña', 'error');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeAdminLogin();
        showNotification('¡Bienvenido administrador!', 'success');
    } catch (error) {
        let message = 'Error al iniciar sesión';
        if (error.code === 'auth/user-not-found') message = 'Usuario no encontrado';
        if (error.code === 'auth/wrong-password') message = 'Contraseña incorrecta';
        showNotification(message, 'error');
    }
}

function logoutAdmin() {
    auth.signOut().then(() => {
        showScreen('login');
        showNotification('Sesión cerrada', 'success');
    });
}

// Crear admin inicial (ejecutar una vez en consola)
function createInitialAdmin(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('✅ Admin creado:', userCredential.user.email);
            alert('Admin creado exitosamente');
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        });
}
