// CONFIGURACIÓN FIREBASE - REEMPLAZA CON TUS CREDENCIALES
const firebaseConfig = {
    apiKey: "AIzaSyBC4UPgUG-BK0QdXCMEiNcAQAp8DU2fB1U",
    authDomain: "glam-room-studio.firebaseapp.com",
    projectId: "glam-room-studio",
    storageBucket: "glam-room-studio.appspot.com",
    messagingSenderId: "724288769963",
    appId: "1:724288769963:web:02e78c225c0ba8c3a20cee"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Colecciones
const clientsCollection = db.collection('clients');
const activityCollection = db.collection('activity');
const appointmentsCollection = db.collection('appointments');

// ==========================================
// CONFIGURACIÓN DE NIVELES Y RECOMPENSAS
// ==========================================

const TIERS = {
    bronze: { 
        name: 'Bronce', 
        min: 0, 
        max: 9, 
        color: '#cd7f32', 
        reward: '10% de descuento' 
    },
    silver: { 
        name: 'Plata', 
        min: 10, 
        max: 24, 
        color: '#c0c0c0', 
        reward: 'Manicure gratis' 
    },
    gold: { 
        name: 'Oro', 
        min: 25, 
        max: 49, 
        color: '#ffd700', 
        reward: 'Tratamiento facial' 
    },
    diamond: { 
        name: 'Diamante', 
        min: 50, 
        max: Infinity, 
        color: '#b9f2ff', 
        reward: 'Día de spa completo' 
    }
};

// ==========================================
// CONFIGURACIÓN WHATSAPP (OPCIONAL)
// ==========================================

const WHATSAPP_CONFIG = {
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: ''
};
