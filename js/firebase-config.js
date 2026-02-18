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
const statsCollection = db.collection('stats');
const activityCollection = db.collection('activity');

// Configuración de niveles y recompensas
const TIERS = {
    bronze: { name: 'Bronce', min: 0, max: 9, color: '#cd7f32', reward: 'Descuento 10%' },
    silver: { name: 'Plata', min: 10, max: 24, color: '#c0c0c0', reward: 'Manicure gratis' },
    gold: { name: 'Oro', min: 25, max: 49, color: '#ffd700', reward: 'Tratamiento facial' },
    diamond: { name: 'Diamante', min: 50, max: Infinity, color: '#b9f2ff', reward: 'Día de spa completo' }
};

// Configuración WhatsApp (Cloud API)
const WHATSAPP_CONFIG = {
    phoneNumberId: 'TU_PHONE_NUMBER_ID', // De Meta Business
    accessToken: 'TU_ACCESS_TOKEN', // Token de acceso
    businessAccountId: 'TU_BUSINESS_ACCOUNT_ID'
};
