// ==========================================
// SISTEMA DE CITAS SIMPLIFICADO
// ==========================================

let appointmentData = {
    clientId: null,
    clientName: '',
    phone: '',
    service: null,
    serviceName: '',
    duration: 0,
    date: null,
    time: null
};

let currentMonth = new Date();
let selectedDate = null;
const businessHours = { start: 9, end: 19, interval: 30 };

function initAppointmentBooking() {
    if (!currentClient) return;
    
    appointmentData.clientId = currentClient.id;
    appointmentData.clientName = currentClient.name;
    appointmentData.phone = currentClient.id;
    
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.getElementById('step1').classList.remove('hidden');
    
    showScreen('appointment');
}

function selectService(id, name, duration) {
    appointmentData.service = id;
    appointmentData.serviceName = name;
    appointmentData.duration = duration;
    
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
    
    renderCalendar();
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    weekDays.forEach(day => {
        html += `<div class="calendar-day header">${day}</div>`;
    });
    
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isPast = date < new Date(today.setHours(0,0,0,0));
        const isSunday = date.getDay() === 0;
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        
        let classes = 'calendar-day';
        if (isPast || isSunday) classes += ' disabled';
        if (isSelected) classes += ' selected';
        
        html += `<div class="${classes}" onclick="${!isPast && !isSunday ? `selectDate(${year}, ${month}, ${day})` : ''}">${day}</div>`;
    }
    
    document.getElementById('calendarGrid').innerHTML = html;
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    appointmentData.date = selectedDate.toISOString().split('T')[0];
    
    renderCalendar();
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    
    loadAvailableTimes();
}

async function loadAvailableTimes() {
    const container = document.getElementById('timeSlots');
    const dateDisplay = document.getElementById('selectedDateDisplay');
    
    dateDisplay.textContent = `Fecha seleccionada: ${selectedDate.toLocaleDateString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })}`;
    
    container.innerHTML = '<p>Cargando horarios...</p>';
    
    try {
        const existingAppointments = await appointmentsCollection
            .where('date', '==', appointmentData.date)
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        
        const bookedTimes = existingAppointments.docs.map(doc => doc.data().time);
        
        const slots = [];
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            for (let min = 0; min < 60; min += businessHours.interval) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                const isBooked = bookedTimes.includes(timeStr);
                
                slots.push(`
                    <button class="time-slot ${isBooked ? 'booked' : ''}" 
                            onclick="${!isBooked ? `selectTime('${timeStr}')` : ''}"
                            ${isBooked ? 'disabled' : ''}>
                        ${timeStr}
                        ${isBooked ? '<small>Ocupado</small>' : ''}
                    </button>
                `);
            }
        }
        
        container.innerHTML = slots.join('');
        
    } catch (error) {
        console.error('Error cargando horarios:', error);
        container.innerHTML = '<p>Error al cargar horarios. Intenta de nuevo.</p>';
    }
}

function selectTime(time) {
    appointmentData.time = time;
    
    document.querySelectorAll('.time-slot').forEach(btn => {
        btn.classList.remove('selected');
        if (!btn.disabled && btn.textContent.includes(time)) {
            btn.classList.add('selected');
        }
    });
    
    setTimeout(() => {
        document.getElementById('step3').classList.add('hidden');
        document.getElementById('step4').classList.remove('hidden');
        updateSummary();
    }, 300);
}

function updateSummary() {
    document.getElementById('summaryService').textContent = appointmentData.serviceName;
    document.getElementById('summaryDate').textContent = selectedDate.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('summaryTime').textContent = appointmentData.time;
    document.getElementById('summaryDuration').textContent = `${appointmentData.duration} minutos`;
}

async function confirmAppointment() {
    const btn = document.querySelector('#step4 .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
    
    try {
        const appointment = {
            ...appointmentData,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            reminderSent: false,
            whatsappReminder: document.getElementById('whatsappReminder').checked
        };
        
        const docRef = await appointmentsCollection.add(appointment);
        
        if (appointment.whatsappReminder) {
            await sendAppointmentWhatsApp(appointment);
        }
        
        document.getElementById('step4').classList.add('hidden');
        document.getElementById('stepSuccess').classList.remove('hidden');
        
        document.getElementById('appointmentDetails').innerHTML = `
            <div class="detail-box">
                <p><strong>${appointment.serviceName}</strong></p>
                <p>📅 ${selectedDate.toLocaleDateString('es-MX')}</p>
                <p>🕐 ${appointment.time}</p>
                <p>⏱️ ${appointment.duration} minutos</p>
            </div>
        `;
        
        await logActivity('appointment', `Nueva cita: ${appointment.clientName} - ${appointment.serviceName}`, appointment.clientId);
        
    } catch (error) {
        console.error('Error agendando cita:', error);
        showNotification('Error al agendar. Intenta de nuevo.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar y Agendar';
    }
}

async function sendAppointmentWhatsApp(appointment) {
    const message = `¡Hola ${appointment.clientName}! 💕✨\n\n` +
        `Tu cita en *Glam Room Studio* ha sido confirmada:\n\n` +
        `💅 *Servicio:* ${appointment.serviceName}\n` +
        `📅 *Fecha:* ${new Date(appointment.date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
        `🕐 *Hora:* ${appointment.time}\n` +
        `⏱️ *Duración:* ${appointment.duration} minutos\n\n` +
        `📍 Dirección: [Tu dirección]\n` +
        `📞 Teléfono: [Tu teléfono]\n\n` +
        `*Importante:*\n` +
        `• Llega 10 minutos antes\n` +
        `• Síguenos en Instagram: @glamroom.studio 📸\n` +
        `• Si necesitas cancelar, avísanos con 24h de anticipación\n\n` +
        `¡Te esperamos! 💖`;
    
    const phone = '52' + appointment.phone;
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    
    await db.collection('whatsapp_notifications').add({
        phone: appointment.phone,
        message: message,
        type: 'appointment_confirmation',
        sentAt: new Date().toISOString()
    });
}

async function showMyAppointments() {
    if (!currentClient) return;
    
    showScreen('myAppointmentsScreen');
    
    const list = document.getElementById('myAppointmentsList');
    list.innerHTML = '<p>Cargando tus citas...</p>';
    
    try {
        const snapshot = await appointmentsCollection
            .where('clientId', '==', currentClient.id)
            .where('date', '>=', new Date().toISOString().split('T')[0])
            .orderBy('date', 'asc')
            .orderBy('time', 'asc')
            .get();
        
        if (snapshot.empty) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No tienes citas próximas</p>
                    <button onclick="initAppointmentBooking()" class="btn-primary">Agendar ahora</button>
                </div>
            `;
            return;
        }
        
        list.innerHTML = snapshot.docs.map(doc => {
            const apt = doc.data();
            const aptDate = new Date(apt.date + 'T' + apt.time);
            const isPast = aptDate < new Date();
            
            return `
                <div class="appointment-card ${isPast ? 'past' : ''}">
                    <div class="appointment-info">
                        <h4>${apt.serviceName}</h4>
                        <p><i class="fas fa-calendar"></i> ${new Date(apt.date).toLocaleDateString('es-MX')}</p>
                        <p><i class="fas fa-clock"></i> ${apt.time}</p>
                        <p><i class="fas fa-hourglass-half"></i> ${apt.duration} min</p>
                    </div>
                    <div class="appointment-status">
                        <span class="badge ${apt.status}">${apt.status === 'confirmed' ? '✓ Confirmada' : '⏳ Pendiente'}</span>
                        ${!isPast ? `
                            <button onclick="cancelAppointment('${doc.id}')" class="btn-cancel">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        list.innerHTML = '<p>Error al cargar citas. Intenta de nuevo.</p>';
    }
}

async function cancelAppointment(appointmentId) {
    if (!confirm('¿Segura que quieres cancelar esta cita?')) return;
    
    try {
        await appointmentsCollection.doc(appointmentId).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
        
        showNotification('Cita cancelada correctamente', 'success');
        showMyAppointments();
        
    } catch (error) {
        showNotification('Error al cancelar', 'error');
    }
}

function backToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.getElementById(`step${step}`).classList.remove('hidden');
}

function backToCard() {
    showScreen('card');
}

function finishAppointment() {
    showMyAppointments();
}
