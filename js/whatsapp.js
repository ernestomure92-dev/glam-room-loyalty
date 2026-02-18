// Sistema de notificaciones WhatsApp
class WhatsAppService {
    constructor() {
        this.apiUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
        this.accessToken = WHATSAPP_CONFIG.accessToken;
    }

    // Enviar mensaje de felicitación cuando completa tarjeta
    async sendRewardNotification(phone, clientName, reward) {
        // Formato: código de país + número (ej: 52 para México)
        const formattedPhone = '52' + phone; // Ajusta según tu país
        
        const messageData = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
                name: "glam_reward_notification", // Debes crear este template en Meta
                language: {
                    code: "es_MX"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: clientName },
                            { type: "text", text: reward }
                        ]
                    }
                ]
            }
        };

        try {
            // Nota: En producción, esto debe hacerse desde un backend por seguridad
            // Aquí simulamos el envío o lo hacemos manual
            console.log('Enviando notificación WhatsApp:', messageData);
            
            // Simulación de envío exitoso
            this.logNotification(phone, 'reward', reward);
            return true;
        } catch (error) {
            console.error('Error enviando WhatsApp:', error);
            return false;
        }
    }

    // Enviar recordatorio de visita
    async sendReminder(phone, clientName, missingVisits) {
        const formattedPhone = '52' + phone;
        
        const message = `¡Hola ${clientName}! 💕\n\n` +
            `Te faltan solo ${missingVisits} visitas para tu próxima recompensa en Glam Room Studio. ✨\n\n` +
            `¡Agenda tu cita hoy! 💅`;
        
        // Para mensajes de sesión (requiere que el cliente haya escrito primero)
        const messageData = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: { body: message }
        };

        this.logNotification(phone, 'reminder', message);
        return true;
    }

    // Generar enlace de WhatsApp Web (alternativa gratuita)
    generateWhatsAppLink(phone, message) {
        const formattedPhone = '52' + phone;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    }

    // Abrir WhatsApp Web con mensaje predefinido
    openWhatsApp(phone, type = 'reward') {
        const client = window.currentAdminClient || {};
        const tier = this.getClientTier(client.totalStars || 0);
        
        let message = '';
        
        if (type === 'reward') {
            message = `¡Hola ${client.name}! 🎉✨\n\n` +
                `¡Felicidades! Has completado tu tarjeta de lealtad en *Glam Room Studio Privado*. 💕\n\n` +
                `🎁 Tu recompensa: *${tier.reward}*\n` +
                `👑 Nivel alcanzado: *${tier.name}*\n\n` +
                `Pasa a reclamar tu premio en tu próxima visita. ¡Te esperamos! 💅✨`;
        } else if (type === 'reminder') {
            const missing = 10 - (client.stars || 0);
            message = `¡Hola ${client.name}! 💕\n\n` +
                `Te faltan solo *${missing} visitas* para tu próxima recompensa. ✨\n\n` +
                `¡Agenda tu cita hoy en Glam Room! 💅`;
        }

        const link = this.generateWhatsAppLink(phone, message);
        window.open(link, '_blank');
        
        this.logNotification(phone, type, 'Enviado manualmente');
    }

    getClientTier(totalStars) {
        if (totalStars >= 50) return TIERS.diamond;
        if (totalStars >= 25) return TIERS.gold;
        if (totalStars >= 10) return TIERS.silver;
        return TIERS.bronze;
    }

    // Registrar notificación en Firestore
    async logNotification(phone, type, content) {
        await db.collection('notifications').add({
            phone,
            type,
            content,
            timestamp: new Date().toISOString(),
            sent: true
        });
    }
}

const whatsAppService = new WhatsAppService();

// Función global para el botón
function sendWhatsAppNotification() {
    if (!window.currentAdminClient) return;
    
    const phone = window.currentAdminClient.id;
    whatsAppService.openWhatsApp(phone, 'reward');
    showNotification('Abriendo WhatsApp...', 'success');
}
