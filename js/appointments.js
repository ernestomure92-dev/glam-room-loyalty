// ==========================================
// APPOINTMENTS - Sistema de Citas
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

document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = await checkSession();
    if (!isLoggedIn) {
        showNotification('Debes iniciar sesión primero', 'error');
        setTimeout(() => navigateTo('index.html'), 2000);
        return;
    }
    
    // Inicializar
    appointmentData.clientId = currentClient.id;
    appointmentData.clientName = currentClient.name;
    appointmentData.phone = currentClient.id;
});

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
    appointmentData.date = DateUtils.toISOString(selectedDate);
    
    renderCalendar();
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    
    loadAvailableTimes();
}

async function loadAvailableTimes() {
    const container = document.getElementById('timeSlots');
    const dateDisplay = document.getElementById('selectedDateDisplay');
    
    dateDisplay.textContent = `Fecha: ${DateUtils.formatDisplay(appointmentData.date)}`;
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
    
    try {
        const snapshot = await db.collection('appointments')
            .where('date', '==', appointmentData.date)
            .get();
        
        const bookedTimes = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'confirmed' || data.status === 'pending') {
                bookedTimes.push(data.time);
            }
        });
        
        const slots = [];
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            for (let min = 0; min < 60; min += businessHours.interval) {
                const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                const isBooked = bookedTimes.includes(timeStr);
                
                slots.push(`
                    <button class="time-slot ${isBooked ? 'booked' : ''}" 
                            ${isBooked ? 'disabled' : `onclick="selectTime('${timeStr}')"`}>
                        ${timeStr}
                        ${isBooked ? '<small>Ocupado</small>' : ''}
                    </button>
                `);
            }
        }
        
        container.innerHTML = slots.join('');
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <p style="color: #e74c3c;">Error al cargar horarios</p>
            <button onclick="loadAvailableTimes()" class="btn-secondary">Reintentar</button>
        `;
    }
}

function selectTime(time) {
    appointmentData.time = time;
    
    document.querySelectorAll('.time-slot').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    
    setTimeout(() => {
        document.getElementById('step3').classList.add('hidden');
        document.getElementById('step4').classList.remove('hidden');
        updateSummary();
    }, 200);
}

function updateSummary() {
    document.getElementById('summaryService').textContent = appointmentData.serviceName;
    document.getElementById('summaryDate').textContent = DateUtils.formatDisplay(appointmentData.date);
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
        
        await db.collection('appointments').add(appointment);
        
        if (appointment.whatsappReminder) {
            sendWhatsAppConfirmation(appointment);
        }
        
        document.getElementById('step4').classList.add('hidden');
        document.getElementById('stepSuccess').classList.remove('hidden');
        
        document.getElementById('appointmentDetails').innerHTML = `
            <div class="detail-box">
                <p><strong>${appointment.serviceName}</strong></p>
                <p>📅 ${DateUtils.formatDisplay(appointment.date)}</p>
                <p>🕐 ${appointment.time}</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al agendar', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar y Agendar';
    }
}

function sendWhatsAppConfirmation(apt) {
    const message = `¡Hola ${apt.clientName}! 💕\n\n` +
        `Tu cita en *Glam Room* está confirmada:\n\n` +
        `💅 ${apt.serviceName}\n` +
        `📅 ${DateUtils.formatDisplay(apt.date)}\n` +
        `🕐 ${apt.time}\n\n` +
        `¡Te esperamos! 💖`;
    
    const phone = '52' + apt.phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function backToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.getElementById(`step${step}`).classList.remove('hidden');
}
