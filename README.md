# 💕 Glam Room - Sistema de Lealtad Profesional

Sistema completo de tarjeta de lealtad digital con Firebase, autenticación, estadísticas y notificaciones WhatsApp.

## 🚀 Características Implementadas

### ✅ Core
- Tarjeta digital con 4 niveles (Bronce, Plata, Oro, Diamante)
- Sistema de estrellas acumulativas
- Historial de visitas completo

### ✅ Autenticación
- Login seguro para administradores (Firebase Auth)
- Protección de rutas administrativas
- Gestión de sesiones persistente

### ✅ Estadísticas Avanzadas
- Dashboard en tiempo real
- Gráficos de visitas semanales (Chart.js)
- Distribución de niveles de clientes
- Actividad reciente
- KPIs: Total clientes, visitas del mes, recompensas pendientes, VIPs

### ✅ Múltiples Recompensas por Nivel
- **Bronce (0-9⭐)**: Descuento 10%
- **Plata (10-24⭐)**: Manicure gratis
- **Oro (25-49⭐)**: Tratamiento facial
- **Diamante (50+⭐)**: Día de spa completo

### ✅ Notificaciones WhatsApp
- Integración con WhatsApp Cloud API
- Mensajes automáticos al completar tarjeta
- Enlace directo a WhatsApp Web (alternativa gratuita)
- Templates personalizables

## 🔥 Configuración Firebase

### 1. Crear Proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea nuevo proyecto → "Glam Room Loyalty"
3. Activa **Authentication** (método: Email/Password)
4. Activa **Firestore Database** (modo producción con reglas)

### 2. Reglas de Seguridad Firestore
