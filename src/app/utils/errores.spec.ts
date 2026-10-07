import { mensajeServidor } from './errores';

describe('Mensajes del servidor para la interfaz', () => {
  const alternativa = 'No se pudo guardar la cuenta. Intentá nuevamente.';
  it('oculta instrucciones de instalación y detalles de la base', () => {
    for (const message of [
      'Para continuar, aplicá SQL 01.',
      'No se pudo guardar. Aplicá SQL 2.',
      'No se pudo consultar la tabla perfiles.',
      'La función gestionar-empleados requiere una actualización.',
      'Could not find the function public.mis_compras in the schema cache',
      'relation "public.perfiles" does not exist',
      'Failed to fetch',
    ])
      expect(mensajeServidor({ message }, alternativa)).toBe(alternativa);
  });
  it('conserva errores de negocio útiles', () => {
    for (const message of [
      'Ese email ya está registrado.',
      'No tenés puntos suficientes.',
      'La compra ya fue cancelada.',
      'Este cupón requiere una edad mínima de 51 años.',
    ])
      expect(mensajeServidor({ code: 'P0001', message }, alternativa)).toBe(message);
  });
  it('traduce permisos, duplicados y relaciones sin mostrar datos internos', () => {
    expect(mensajeServidor({ code: '42501' }, alternativa)).toContain('permiso');
    expect(mensajeServidor({ code: '23505' }, alternativa)).toContain('Ya existe');
    expect(mensajeServidor({ code: '23503' }, alternativa)).toContain('datos relacionados');
    expect(mensajeServidor(null, alternativa)).toBe(alternativa);
  });
});
