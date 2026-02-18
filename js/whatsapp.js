// ==========================================
// SERVICIO WHATSAPP
// ==========================================

class WhatsAppService {
    constructor() {
        this.apiUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
        this.accessToken = WHATSAPP_CONFIG.accessToken;
    }

    generateWhatsAppLink(phone, message) {
        const formattedPhone = '52' + phone;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    }

    openWhatsApp(phone, type = 'reward', clientData = {}) {
        let message = '';
        
        if (type === 'reward') {
            const tier = this.getClientTier(clientData.totalStars || 0);
            message = `¡Hola ${clientData.name}! 🎉✨\n\n` +
                `¡Felicidades! Has completado tu tarjeta de lealtad en *Glam Room Studio*. 💕\n\n` +
                `🎁 Tu recompensa: *${tier.reward}*\n` +
                `👑 Nivel alcanzado: *${tier.name}*\n\n` +
                `Pasa a reclamar tu premio en tu próxima visita. ¡Te esperamos! 💅✨`;
        } else if (type === 'reminder') {
            const missing = 10 - (clientData.stars || 0);
            message = `¡Hola ${clientData.name}! 💕\n\n` +
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

function sendWhatsAppNotification() {
    if (!window.currentAdminClient) return;
    
    const phone = window.currentAdminClient.id;
    whatsAppService.openWhatsApp(phone, 'reward', window.currentAdminClient);
    showNotification('Abriendo WhatsApp...', 'success');
}
