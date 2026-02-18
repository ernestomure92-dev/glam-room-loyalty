// ==========================================
// SISTEMA DE AGENDAMIENTO DE CITAS
// ==========================================

// Variables de estado
let appointmentData = {
    clientId: null,
    clientName: '',
    service: null,
    serviceName: '',
    duration: 0,
    stylistId: null,
    stylistName: '',
    date: null,
    time: null,
    phone: ''
};

let currentMonth = new Date();
let selectedDate = null;
const businessHours = {
    start: 9,  // 9:00 AM
    end: 19,   // 7:00 PM
    interval: 30 // minutos
};

// Inicializar agendamiento
function initAppointmentBooking(clientPhone, clientName) {
    appointmentData.clientId = clientPhone;
    appointmentData.clientName = clientName;
    appointmentData.phone = clientPhone;
    
    // Resetear pasos
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.getElementById('step1').classList.remove('hidden');
    
    showScreen('appointment');
}

// Seleccionar servicio
function selectService(id, name, duration) {
    appointmentData.service = id;
    appointmentData.serviceName = name;
    appointmentData.duration = duration;
    
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
    
    loadStylists();
}

// Cargar estilistas desde Firebase
async function loadStylists() {
    const grid = document.getElementById('stylistsGrid');
    grid.innerHTML = '<p>Cargando estilistas...</p>';
    
    try {
        const snapshot = await db.collection('stylists').where('active', '==', true).get();
        
        if (snapshot.empty) {
            // Estilistas por defecto si no hay en BD
            const defaultStylists = [
                { id: 'any', name: 'Cualquier disponible', specialty: 'Todas', photo: '👩‍🎨' },
                { id: 'maria', name: 'María', specialty: 'Manicure & Gel', photo: '💅' },
                { id: 'ana', name: 'Ana', specialty: 'Maquillaje', photo: '💄' },
                { id: 'laura', name: 'Laura', specialty: 'Facial & Spa', photo: '✨' }
            ];
            
            grid.innerHTML = defaultStylists.map(s => `
                <div class="stylist-card" onclick="selectStylist('${s.id}', '${s.name}')">
                    <div class="stylist-photo">${s.photo}</div>
                    <span class="stylist-name">${s.name}</span>
                    <small>${s.specialty}</small>
                </div>
            `).join('');
        } else {
            grid.innerHTML = snapshot.docs.map(doc => {
                const s = doc.data();
                return `
                    <div class="stylist-card" onclick="selectStylist('${doc.id}', '${s.name}')">
                        <img src="${s.photo || 'assets/stylist-default.png'}" alt="${s.name}" class="stylist-img">
                        <span class="stylist-name">${s.name}</span>
                        <small>${s.specialty}</small>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error cargando estilistas:', error);
        showNotification('Error al cargar estilistas', 'error');
    }
}

// Seleccionar estilista
function selectStylist(id, name) {
    appointmentData.stylistId = id;
    appointmentData.stylistName = name;
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    
    renderCalendar();
}

// Renderizar calendario
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Actualizar header
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    
    // Días de la semana
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    weekDays.forEach(day => {
        html += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Espacios vacíos antes del primer día
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }
    
    // Días del mes
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

// Cambiar mes
function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

// Seleccionar fecha
function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    appointmentData.date = selectedDate.toISOString().split('T')[0];
    
    renderCalendar(); // Para actualizar selección visual
    
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step4').classList.remove('hidden');
    
    loadAvailableTimes();
}

// Cargar horarios disponibles
async function loadAvailableTimes() {
    const container = document.getElementById('timeSlots');
    const dateDisplay = document.getElementById('selectedDateDisplay');
    
    dateDisplay.textContent = `Fecha seleccionada: ${selectedDate.toLocaleDateString('es-MX', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    })}`;
    
    container.innerHTML = '<p>Cargando horarios...</p>';
    
    try {
        // Obtener citas existentes para esa fecha
        const existingAppointments = await db.collection('appointments')
            .where('date', '==', appointmentData.date)
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        
        const bookedTimes = existingAppointments.docs.map(doc => doc.data().time);
        
        // Generar slots de tiempo
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

// Seleccionar hora
function selectTime(time) {
    appointmentData.time = time;
    
    // Actualizar UI
    document.querySelectorAll('.time-slot').forEach(btn => {
        btn.classList.remove('selected');
        if (!btn.disabled && btn.textContent.includes(time)) {
            btn.classList.add('selected');
        }
    });
    
    // Pequeña pausa para mostrar selección
    setTimeout(() => {
        document.getElementById('step4').classList.add('hidden');
        document.getElementById('step5').classList.remove('hidden');
        updateSummary();
    }, 300);
}

// Actualizar resumen
function updateSummary() {
    document.getElementById('summaryService').textContent = appointmentData.serviceName;
    document.getElementById('summaryStylist').textContent = appointmentData.stylistName;
    document.getElementById('summaryDate').textContent = selectedDate.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('summaryTime').textContent = appointmentData.time;
    document.getElementById('summaryDuration').textContent = `${appointmentData.duration} minutos`;
}

// Confirmar cita
async function confirmAppointment() {
    const btn = document.querySelector('#step5 .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
    
    try {
        // Crear objeto de cita
        const appointment = {
            ...appointmentData,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            reminderSent: false,
            whatsappReminder: document.getElementById('whatsappReminder').checked
        };
        
        // Guardar en Firebase
        const docRef = await db.collection('appointments').add(appointment);
        
        // Enviar notificación WhatsApp
        if (appointment.whatsappReminder) {
            await sendAppointmentWhatsApp(appointment);
        }
        
        // Programar recordatorio (24 horas antes)
        await scheduleReminder(docRef.id, appointment);
        
        // Mostrar éxito
        document.getElementById('step5').classList.add('hidden');
        document.getElementById('stepSuccess').classList.remove('hidden');
        
        document.getElementById('appointmentDetails').innerHTML = `
            <div class="detail-box">
                <p><strong>${appointment.serviceName}</strong></p>
                <p>📅 ${selectedDate.toLocaleDateString('es-MX')}</p>
                <p>🕐 ${appointment.time}</p>
                <p>👤 Con: ${appointment.stylistName}</p>
            </div>
        `;
        
        // Registrar actividad
        await logActivity('appointment', `Nueva cita: ${appointment.clientName} - ${appointment.serviceName}`, appointment.clientId);
        
    } catch (error) {
        console.error('Error agendando cita:', error);
        showNotification('Error al agendar. Intenta de nuevo.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar y Agendar';
    }
}

// Enviar WhatsApp de confirmación
async function sendAppointmentWhatsApp(appointment) {
    const message = `¡Hola ${appointment.clientName}! 💕✨\n\n` +
        `Tu cita en *Glam Room Studio* ha sido confirmada:\n\n` +
        `💅 *Servicio:* ${appointment.serviceName}\n` +
        `📅 *Fecha:* ${new Date(appointment.date).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })}\n` +
        `🕐 *Hora:* ${appointment.time}\n` +
        `⏱️ *Duración:* ${appointment.duration} minutos\n` +
        `👤 *Estilista:* ${appointment.stylistName}\n\n` +
        `📍 Dirección: [Tu dirección aquí]\n` +
        `📞 Teléfono: [Tu teléfono aquí]\n\n` +
        `*Importante:*\n` +
        `• Llega 10 minutos antes\n` +
        `• Si necesitas cancelar, avísanos con 24h de anticipación\n\n` +
        `¡Te esperamos! 💖`;
    
    // Abrir WhatsApp Web
    const phone = '52' + appointment.phone; // Código México
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    
    // También guardar en Firebase para registro
    await db.collection('whatsapp_notifications').add({
        phone: appointment.phone,
        message: message,
        type: 'appointment_confirmation',
        sentAt: new Date().toISOString(),
        appointmentId: appointment.id
    });
}

// Programar recordatorio
async function scheduleReminder(appointmentId, appointment) {
    const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
    const reminderDate = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000)); // 24h antes
    
    // Si la cita es mañana, enviar recordatorio en 1 hora
    if (reminderDate < new Date()) {
        console.log('Cita muy pronto, recordatorio se enviará pronto');
        return;
    }
    
    // Guardar en colección de recordatorios pendientes
    await db.collection('scheduled_reminders').add({
        appointmentId: appointmentId,
        phone: appointment.phone,
        clientName: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
        service: appointment.serviceName,
        reminderDate: reminderDate.toISOString(),
        status: 'pending'
    });
}

// Ver mis citas
async function showMyAppointments() {
    showScreen('myAppointmentsScreen');
    
    const list = document.getElementById('myAppointmentsList');
    list.innerHTML = '<p>Cargando tus citas...</p>';
    
    try {
        const snapshot = await db.collection('appointments')
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
                    <button onclick="showAppointmentBooking()" class="btn-primary">Agendar ahora</button>
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
                        <p><i class="fas fa-user"></i> ${apt.stylistName}</p>
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

// Cancelar cita
async function cancelAppointment(appointmentId) {
    if (!confirm('¿Segura que quieres cancelar esta cita?')) return;
    
    try {
        await db.collection('appointments').doc(appointmentId).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
        
        showNotification('Cita cancelada correctamente', 'success');
        showMyAppointments(); // Recargar lista
        
    } catch (error) {
        showNotification('Error al cancelar', 'error');
    }
}

// Navegación
function backToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.getElementById(`step${step}`).classList.remove('hidden');
}

function backToCard() {
    showScreen('card');
}

function showAppointmentBooking() {
    initAppointmentBooking(currentClient.id, currentClient.name);
}

function finishAppointment() {
    showMyAppointments();
}

// Agregar botón de "Agendar Cita" en la tarjeta de cliente
function addAppointmentButton() {
    const cardContent = document.querySelector('.card-content');
    if (!document.getElementById('btnAgendar')) {
        const btn = document.createElement('button');
        btn.id = 'btnAgendar';
        btn.className = 'btn-primary';
        btn.style.marginTop = '20px';
        btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Agendar Nueva Cita';
        btn.onclick = () => initAppointmentBooking(currentClient.id, currentClient.name);
        cardContent.appendChild(btn);
    }
}
