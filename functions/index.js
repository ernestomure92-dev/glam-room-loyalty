const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Recordatorio automático 24 horas antes de la cita
exports.sendAppointmentReminder = functions.pubsub.schedule('every 1 hours')
    .onRun(async (context) => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        // Buscar citas que necesitan recordatorio (entre 23-25 horas antes)
        const startTime = new Date(tomorrow.getTime() - 60 * 60 * 1000); // 23h antes
        const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000);   // 25h antes
        
        const appointments = await admin.firestore()
            .collection('appointments')
            .where('date', '==', tomorrow.toISOString().split('T')[0])
            .where('reminderSent', '==', false)
            .where('status', '==', 'confirmed')
            .get();
        
        const promises = [];
        
        appointments.forEach(doc => {
            const apt = doc.data();
            const aptDateTime = new Date(apt.date + 'T' + apt.time);
            
            // Verificar que esté en la ventana de 24h
            if (aptDateTime >= startTime && aptDateTime <= endTime && apt.whatsappReminder) {
                promises.push(sendReminder(doc.id, apt));
            }
        });
        
        await Promise.all(promises);
        console.log(`Enviados ${promises.length} recordatorios`);
    });

async function sendReminder(appointmentId, appointment) {
    const message = `¡Hola ${appointment.clientName}! 💅✨\n\n` +
        `Recordatorio de tu cita mañana en *Glam Room Studio*:\n\n` +
        `📅 *Fecha:* ${new Date(appointment.date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
        `🕐 *Hora:* ${appointment.time}\n` +
        `💅 *Servicio:* ${appointment.serviceName}\n` +
        `👤 *Estilista:* ${appointment.stylistName}\n\n` +
        `📍 No olvides llegar 10 minutos antes.\n` +
        `¿Necesitas cambiar algo? Responde a este mensaje.\n\n` +
        `¡Te esperamos! 💖`;
    
    // Aquí integrarías la API oficial de WhatsApp Business
    // Por ahora, marcamos como enviado
    await admin.firestore().collection('appointments').doc(appointmentId).update({
        reminderSent: true,
        reminderSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Guardar en log
    await admin.firestore().collection('whatsapp_notifications').add({
        phone: appointment.phone,
        message: message,
        type: 'appointment_reminder',
        appointmentId: appointmentId,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'scheduled'
    });
    
    console.log('Recordatorio programado para:', appointment.phone);
}

// Notificación cuando se agenda nueva cita (inmediata)
exports.onNewAppointment = functions.firestore
    .document('appointments/{appointmentId}')
    .onCreate(async (snap, context) => {
        const apt = snap.data();
        
        // Notificar al admin (tú)
        const adminMessage = `📅 *Nueva Cita Agendada*\n\n` +
            `Cliente: ${apt.clientName}\n` +
            `Servicio: ${apt.serviceName}\n` +
            `Fecha: ${apt.date}\n` +
            `Hora: ${apt.time}\n` +
            `Estilista: ${apt.stylistName}\n\n` +
            `Revisa el panel de admin para más detalles.`;
        
        // Guardar notificación para el admin
        await admin.firestore().collection('admin_notifications').add({
            type: 'new_appointment',
            message: adminMessage,
            appointmentId: context.params.appointmentId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false
        });
    });
