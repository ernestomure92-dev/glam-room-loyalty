// ==========================================
// SISTEMA DE CITAS SIMPLIFICADO - CORREGIDO
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
    
    appointmentData = {
        clientId: currentClient.id,
        clientName: currentClient.name,
        phone: currentClient.id,
        service: null,
        serviceName: '',
        duration: 0,
        date: null,
        time: null
    };
    
    selectedDate = null;
    currentMonth = new Date();
    
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
    today.setHours(0, 0, 0, 0);
    
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
        const isPast = date < today;
        const isSunday = date.getDay() === 0;
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        
        let classes = 'calendar-day';
        if (isPast || isSunday) classes += ' disabled';
        if (isSelected) classes += ' selected';
        
        if (!isPast && !isSunday) {
            html += `<div class="${classes}" onclick="selectDate(${year}, ${month}, ${day})">${day}</div>`;
        } else {
            html += `<div class="${classes}">${day}</div>`;
        }
    }
    
    document.getElementById('calendarGrid').innerHTML = html;
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    appointmentData.date = `${yyyy}-${mm}-${dd}`;
    
    renderCalendar();
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    
    loadAvailableTimes();
}

async function loadAvailableTimes() {
    const container = document.getElementById('timeSlots');
    const dateDisplay = document.getElementById('selectedDateDisplay');
    
    if (!selectedDate) {
        container.innerHTML = '<p style="color: #e74c3c;">Error: No hay fecha seleccionada</p>';
        return;
    }
    
    dateDisplay.textContent = `Fecha seleccionada: ${selectedDate.toLocaleDateString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })}`;
    
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Cargando horarios...</p>';
    
    try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        console.log('Buscando citas para fecha:', dateString);
        
        // Consulta simple sin índices complejos
        const snapshot = await db.collection('appointments')
            .where('date', '==', dateString)
            .get();
        
        const bookedTimes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'confirmed' || data.status === 'pending') {
                bookedTimes.push(data.time);
            }
        });
        
        console.log('Horarios ocupados:', bookedTimes);
        
        const slots = [];
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            for (let min = 0; min < 60; min += businessHours.interval) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                const isBooked = bookedTimes.includes(timeStr);
                
                if (isBooked) {
                    slots.push(`
                        <button class="time-slot booked" disabled>
                            ${timeStr}
                            <small>Ocupado</small>
                        </button>
                    `);
                } else {
                    slots.push(`
                        <button class="time-slot" onclick="selectTime('${timeStr}')">
                            ${timeStr}
                        </button>
                    `);
                }
            }
        }
        
        container.innerHTML = slots.join('') || '<p>No hay horarios disponibles</p>';
        
    } catch (error) {
        console.error('Error completo:', error);
        container.innerHTML = `
            <div style="text-align: center; color: #e74c3c; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <p>Error al cargar horarios</p>
                <p style="font-size: 0.8rem; color: #666; margin-top: 10px;">${error.message}</p>
                <button onclick="loadAvailableTimes()" class="btn-secondary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

function selectTime(time) {
    appointmentData.time = time;
    
    document.querySelectorAll('.time-slot').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    
    setTimeout(() => {
        document.getElementById('step3').classList.add('hidden');
        document.getElementById('step4').classList.remove('hidden');
        updateSummary();
    }, 200);
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
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
    
    try {
        const appointment = {
            clientId: appointmentData.clientId,
            clientName: appointmentData.clientName,
            phone: appointmentData.phone,
            service: appointmentData.service,
            serviceName: appointmentData.serviceName,
            duration: appointmentData.duration,
            date: appointmentData.date,
            time: appointmentData.time,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            reminderSent: false,
            whatsappReminder: document.getElementById('whatsappReminder').checked
        };
        
        console.log('Guardando cita:', appointment);
        
        const docRef = await db.collection('appointments').add(appointment);
        console.log('Cita guardada con ID:', docRef.id);
        
        if (appointment.whatsappReminder) {
            await sendAppointmentWhatsApp(appointment);
        }
        
        document.getElementById('step4').classList.add('hidden');
        document.getElementById('stepSuccess').classList.remove('hidden');
        
        document.getElementById('appointmentDetails').innerHTML = `
            <div class="detail-box">
                <p><strong>${appointment.serviceName}</strong></p>
                <p>📅 ${selectedDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>🕐 ${appointment.time}</p>
                <p>⏱️ ${appointment.duration} minutos</p>
            </div>
        `;
        
        if (typeof logActivity === 'function') {
            await logActivity('appointment', `Nueva cita: ${appointment.clientName} - ${appointment.serviceName}`, appointment.clientId);
        }
        
    } catch (error) {
        console.error('Error agendando cita:', error);
        showNotification('Error al agendar: ' + error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function sendAppointmentWhatsApp(appointment) {
    const message = `¡Hola ${appointment.clientName}! 💕✨\n\n` +
        `Tu cita en *Glam Room Studio* ha sido confirmada:\n\n` +
        `💅 *Servicio:* ${appointment.serviceName}\n` +
        `📅 *Fecha:* ${new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
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
    
    try {
        await db.collection('whatsapp_notifications').add({
            phone: appointment.phone,
            message: message,
            type: 'appointment_confirmation',
            sentAt: new Date().toISOString()
        });
    } catch (e) {
        console.log('No se pudo guardar log de WhatsApp:', e);
    }
}

async function showMyAppointments() {
    if (!currentClient) return;
    
    showScreen('myAppointmentsScreen');
    
    const list = document.getElementById('myAppointmentsList');
    list.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Cargando tus citas...</p>';
    
    try {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        const snapshot = await db.collection('appointments')
            .where('clientId', '==', currentClient.id)
            .where('date', '>=', todayString)
            .get();
        
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        
        appointments.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });
        
        if (appointments.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times" style="font-size: 4rem; color: var(--light-pink); margin-bottom: 20px; display: block;"></i>
                    <p>No tienes citas próximas</p>
                    <button onclick="initAppointmentBooking()" class="btn-primary" style="margin-top: 20px;">
                        Agendar ahora
                    </button>
                </div>
            `;
            return;
        }
        
        list.innerHTML = appointments.map(apt => {
            const aptDate = new Date(apt.date + 'T' + apt.time);
            const isPast = aptDate < new Date();
            
            return `
                <div class="appointment-card ${isPast ? 'past' : ''}">
                    <div class="appointment-info">
                        <h4>${apt.serviceName}</h4>
                        <p><i class="fas fa-calendar"></i> ${new Date(apt.date + 'T00:00:00').toLocaleDateString('es-MX')}</p>
                        <p><i class="fas fa-clock"></i> ${apt.time}</p>
                        <p><i class="fas fa-hourglass-half"></i> ${apt.duration} min</p>
                    </div>
                    <div class="appointment-status">
                        <span class="badge ${apt.status}">${apt.status === 'confirmed' ? '✓ Confirmada' : '⏳ Pendiente'}</span>
                        ${!isPast && apt.status !== 'cancelled' ? `
                            <button onclick="cancelAppointment('${apt.id}')" class="btn-cancel">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 15px; display: block;"></i>
                <p>Error al cargar citas</p>
                <button onclick="showMyAppointments()" class="btn-secondary" style="margin-top: 15px;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

async function cancelAppointment(appointmentId) {
    if (!confirm('¿Segura que quieres cancelar esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(appointmentId).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
        
        showNotification('Cita cancelada correctamente', 'success');
        showMyAppointments();
        
    } catch (error) {
        console.error('Error cancelando cita:', error);
        showNotification('Error al cancelar: ' + error.message, 'error');
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
