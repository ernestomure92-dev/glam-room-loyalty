// Validaciones centralizadas

/**
 * Valida número de teléfono mexicano
 * Formatos aceptados: 5512345678, +525512345678, 52-551-234-5678, etc.
 */
export function validarTelefonoMexico(telefono) {
  if (!telefono || typeof telefono !== 'string') {
    return { valido: false, error: 'Ingresa un número de teléfono' };
  }

  // Eliminar todo excepto números
  const numeros = telefono.replace(/\D/g, '');
  
  // Validaciones
  if (numeros.length === 0) {
    return { valido: false, error: 'Ingresa un número de teléfono' };
  }
  
  if (numeros.length < 10) {
    return { valido: false, error: 'El número debe tener al menos 10 dígitos' };
  }
  
  if (numeros.length > 13) {
    return { valido: false, error: 'El número es demasiado largo' };
  }

  // Extraer solo los últimos 10 dígitos (sin lada internacional)
  const diezDigitos = numeros.slice(-10);
  
  // Validar que empiece con código válido en México (1, 2, 3, 4, 5, 6, 7, 8, 9)
  const primerDigito = parseInt(diezDigitos[0]);
  if (primerDigito < 1 || primerDigito > 9) {
    return { valido: false, error: 'Número de teléfono no válido para México' };
  }

  // Formatear para mostrar: 55 1234 5678
  const formateado = `${diezDigitos.slice(0, 2)} ${diezDigitos.slice(2, 6)} ${diezDigitos.slice(6)}`;
  
  // Formato internacional para Firebase/WhatsApp: +525512345678
  const internacional = `+52${diezDigitos}`;

  return {
    valido: true,
    formateado: formateado,
    internacional: internacional,
    basico: diezDigitos
  };
}

/**
 * Valida correo electrónico
 */
export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !regex.test(email)) {
    return { valido: false, error: 'Correo electrónico no válido' };
  }
  return { valido: true, valor: email.toLowerCase().trim() };
}

/**
 * Valida nombre (solo letras y espacios)
 */
export function validarNombre(nombre) {
  if (!nombre || nombre.trim().length < 2) {
    return { valido: false, error: 'Nombre muy corto' };
  }
  
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!regex.test(nombre)) {
    return { valido: false, error: 'El nombre solo puede contener letras' };
  }
  
  return { valido: true, valor: nombre.trim() };
}

/**
 * Sanitiza input para prevenir XSS
 */
export function sanitizarInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers inline
    .trim();
}
