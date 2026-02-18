import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Verifica disponibilidad de horario
 */
export async function verificarDisponibilidad(fecha, hora, duracionMinutos = 60) {
  try {
    // Validar que no sea fecha pasada
    const fechaHora = new Date(`${fecha}T${hora}`);
    if (fechaHora < new Date()) {
      return { 
        disponible: false, 
        error: 'No puedes agendar citas en el pasado' 
      };
    }

    // Validar horario de atención (ejemplo: 9:00 - 19:00)
    const horaInt = parseInt(hora.split(':')[0]);
    if (horaInt < 9 || horaInt >= 19) {
      return { 
        disponible: false, 
        error: 'Horario de atención: 9:00 - 19:00' 
      };
    }

    // Verificar si ya existe cita en ese horario
    const citasRef = collection(db, 'appointments');
    const q = query(
      citasRef, 
      where('fecha', '==', fecha),
      where('estado', '!=', 'cancelada')
    );
    
    const snapshot = await getDocs(q);
    
    // Verificar solapamiento
    const horaInicioNueva = convertirAMinutos(hora);
    const horaFinNueva = horaInicioNueva + duracionMinutos;
    
    for (const doc of snapshot.docs) {
      const cita = doc.data();
      const horaInicioExistente = convertirAMinutos(cita.hora);
      const horaFinExistente = horaInicioExistente + (cita.duracion || 60);
      
      // Hay solapamiento?
      if (haySolapamiento(
        horaInicioNueva, horaFinNueva,
        horaInicioExistente, horaFinExistente
      )) {
        return {
          disponible: false,
          error: `Este horario ya está ocupado. La cita existente es a las ${cita.hora}`,
          conflicto: cita
        };
      }
    }

    return { disponible: true };

  } catch (error) {
    console.error('Error verificando disponibilidad:', error);
    return { 
      disponible: false, 
      error: 'Error al verificar disponibilidad. Intenta de nuevo.' 
    };
  }
}

function convertirAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function haySolapamiento(inicio1, fin1, inicio2, fin2) {
  return inicio1 < fin2 && fin1 > inicio2;
}

/**
 * Obtiene horarios disponibles para una fecha
 */
export async function obtenerHorariosDisponibles(fecha, duracion = 60) {
  const horarios = [];
  const inicio = 9; // 9:00 AM
  const fin = 19;   // 7:00 PM
  
  // Obtener citas existentes
  const citasRef = collection(db, 'appointments');
  const q = query(
    citasRef,
    where('fecha', '==', fecha),
    where('estado', '!=', 'cancelada')
  );
  
  const snapshot = await getDocs(q);
  const citasOcupadas = snapshot.docs.map(d => ({
    inicio: convertirAMinutos(d.data().hora),
    fin: convertirAMinutos(d.data().hora) + (d.data().duracion || 60)
  }));

  // Generar slots cada 30 minutos
  for (let h = inicio; h < fin; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slotInicio = h * 60 + m;
      const slotFin = slotInicio + duracion;
      
      // Verificar si está disponible
      const ocupado = citasOcupadas.some(cita => 
        haySolapamiento(slotInicio, slotFin, cita.inicio, cita.fin)
      );
      
      if (!ocupado && slotFin <= fin * 60) {
        horarios.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
  }
  
  return horarios;
}
