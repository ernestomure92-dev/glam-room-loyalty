// ==========================================
// WHATSAPP WEB - Integración Gratuita
// ==========================================

class WhatsAppService {
    constructor() {
        this.businessInfo = {
            name: 'Glam Room Studio',
            phone: '5523313628', // Tu número de WhatsApp Business
            address: 'Ambato 910 Lindavista Norte, Gam',
            instagram: '@theglamroom.cdmx'
        };
    }

    // ==========================================
    // MENSAJES DE CITAS
    // ==========================================

    sendAppointmentConfirmation(appointment) {
        const message = this.formatAppointmentMessage(appointment);
        return this.openWhatsApp(appointment.phone, message);
    }

    sendAppointmentReminder(appointment) {
        const message = this.formatReminderMessage(appointment);
        return this.openWhatsApp(appointment.phone, message);
    }

    sendCancellationNotice(appointment, cancelledBy = 'cliente') {
        const message = this.formatCancellationMessage(appointment, cancelledBy);
        return this.openWhatsApp(appointment.phone, message);
    }

    // ==========================================
    // MENSAJES DE LEALTAD
    // ==========================================

    sendRewardNotification(client, tier) {
        const message = this.formatRewardMessage(client, tier);
        return this.openWhatsApp(client.phone || client.id, message);
    }

    sendBirthdayGreeting(client) {
        const message = this.formatBirthdayMessage(client);
        return this.openWhatsApp(client.phone || client.id, message);
    }

    sendPromoNotification(client, promoText) {
        const message = this.formatPromoMessage(client, promoText);
        return this.openWhatsApp(client.phone || client.id, message);
    }

    // ==========================================
    // FORMATO DE MENSAJES
    // ==========================================

    formatAppointmentMessage(apt) {
        const date = this.formatDate(apt.date);
        
        return `✨ *¡Hola ${apt.clientName}!* ✨\n\n` +
            `Tu cita en *${this.businessInfo.name}* está confirmada:\n\n` +
            `💅 *Servicio:* ${apt.serviceName}\n` +
            `📅 *Fecha:* ${date}\n` +
            `🕐 *Hora:* ${apt.time}\n` +
            `⏱️ *Duración:* ${apt.duration} minutos\n\n` +
            `📍 *Dirección:*\n${this.businessInfo.address}\n\n` +
            `📲 *Contacto:* ${this.businessInfo.phone}\n` +
            `📸 *Instagram:* ${this.businessInfo.instagram}\n\n` +
            `*Importante:*\n` +
            `• Llega 10 minutos antes ⏰\n` +
            `• Si necesitas cancelar, avísanos con 24h de anticipación\n` +
            `• Trae tu tarjeta de lealtad para acumular estrellas ⭐\n\n` +
            `¡Te esperamos! 💖✨`;
    }

    formatReminderMessage(apt) {
        const date = this.formatDate(apt.date);
        
        return `⏰ *Recordatorio de Cita* ⏰\n\n` +
            `¡Hola ${apt.clientName}! 💕\n\n` +
            `Te recordamos tu cita para *mañana*:\n\n` +
            `💅 ${apt.serviceName}\n` +
            `📅 ${date}\n` +
            `🕐 ${apt.time}\n\n` +
            `¿Necesitas cambiar algo? Escríbenos respondiendo este mensaje.\n\n` +
            `¡Nos vemos pronto! ✨`;
    }

    formatCancellationMessage(apt, cancelledBy) {
        const who = cancelledBy === 'admin' ? 'nosotros' : 'ti';
        
        return `📋 *Actualización de Cita* 📋\n\n` +
            `Hola ${apt.clientName},\n\n` +
            `Tu cita del ${this.formatDate(apt.date)} a las ${apt.time} ` +
            `ha sido cancelada por ${who}.\n\n` +
            `¿Quieres reagendar? Escríbenos y con gusto te ayudamos. 💅\n\n` +
            `¡Gracias por preferirnos! ✨`;
    }

    formatRewardMessage(client, tier) {
        return `🎉 *¡Felicidades ${client.name}!* 🎉\n\n` +
            `Has completado tu tarjeta de lealtad en *${this.businessInfo.name}*! 💕\n\n` +
            `👑 *Nivel alcanzado:* ${tier.name}\n` +
            `🎁 *Tu recompensa:* ${tier.reward}\n\n` +
            `Pasa a reclamar tu premio en tu próxima visita.\n` +
            `¡Te esperamos! 💅✨\n\n` +
            `📸 Síguenos: ${this.businessInfo.instagram}`;
    }

    formatBirthdayMessage(client) {
        return `🎂 *¡Feliz Cumpleaños ${client.name}!* 🎂\n\n` +
            `El equipo de *${this.businessInfo.name}* te desea un día lleno de belleza y alegría. 💕\n\n` +
            `🎁 *Tu regalo:* 20% de descuento en tu próximo servicio\n` +
            `Válido durante todo este mes ✨\n\n` +
            `¡Agenda tu cita y celebra con nosotras! 💅`;
    }

    formatPromoMessage(client, promoText) {
        return `✨ *Promoción Especial* ✨\n\n` +
            `Hola ${client.name}, 💕\n\n` +
            `${promoText}\n\n` +
            `📅 Válido hasta: [fecha]\n` +
            `📲 Agenda tu cita: ${this.businessInfo.phone}\n\n` +
            `¡No te lo pierdas! 💅✨`;
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    openWhatsApp(phone, message) {
        // Limpiar número
        let cleanPhone = phone.replace(/\D/g, '');
        
        // Agregar código de país si no lo tiene
        if (!cleanPhone.startsWith('52')) {
            cleanPhone = '52' + cleanPhone;
        }
        
        // Codificar mensaje
        const encodedMessage = encodeURIComponent(message);
        
        // Generar URL
        const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        // Abrir en nueva pestaña
        window.open(url, '_blank');
        
        // Guardar log
        this.logMessage(phone, message);
        
        return url;
    }

    formatDate(dateString) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return new Date(dateString + 'T00:00:00').toLocaleDateString('es-MX', options);
    }

    async logMessage(phone, message) {
        try {
            await db.collection('whatsapp_logs').add({
                phone: phone,
                messagePreview: message.substring(0, 100) + '...',
                sentAt: new Date().toISOString(),
                type: 'whatsapp_web'
            });
        } catch (e) {
            // No crítico si falla
            console.log('Log no guardado:', e);
        }
    }

    // ==========================================
    // BOTONES RÁPIDOS PARA ADMIN
    // ==========================================

    // Botón flotante de WhatsApp en la página
    createFloatButton(containerId = 'body') {
        const button = document.createElement('a');
        button.href = `https://wa.me/52${this.businessInfo.phone}`;
        button.target = '_blank';
        button.className = 'whatsapp-float';
        button.innerHTML = '<i class="fab fa-whatsapp"></i>';
        button.title = 'Contáctanos por WhatsApp';
        
        document.querySelector(containerId).appendChild(button);
    }
}

// Instancia global
const whatsAppService = new WhatsAppService();
