import { TestBed } from '@angular/core/testing';
import { User } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { Usuarios } from './usuarios';
import { Supabase } from './supabase';
import { Configuracion } from './configuracion';

describe('Usuarios con Supabase Auth', () => {
  const user: User = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'ana@cine.test',
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    user_metadata: {
      nombre: 'Ana',
      apellido: 'Pérez',
      fechaNacimiento: '1980-01-01',
      rol: 'admin',
    },
  };
  const perfilInicial = {
    id: 7,
    auth_id: user.id,
    nombre: 'Ana',
    apellido: 'Pérez',
    email: user.email,
    fecha_nacimiento: '1980-01-01',
    rol: 'cliente',
    primera_compra_realizada: false,
  };
  let perfil: typeof perfilInicial | undefined;
  let escuchar: (evento: string, sesion: { user: User } | null) => void;
  let inicial: { user: User } | null;
  let service: Usuarios;
  let confirmarCorreo: boolean;
  const upsert = vi.fn();
  const maybeSingle = vi.fn();
  const single = vi.fn();
  const unsubscribe = vi.fn();
  const signOut = vi.fn();
  const signInWithPassword = vi.fn();
  const signUp = vi.fn();
  const invocarGestion = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    perfil = { ...perfilInicial };
    inicial = null;
    confirmarCorreo = false;
    maybeSingle.mockImplementation(async () => ({ data: perfil, error: null }));
    single.mockImplementation(async () => ({ data: perfil, error: null }));
    upsert.mockImplementation(async (datos) => {
      perfil = { id: 7, ...datos };
      return { error: null };
    });
    signOut.mockImplementation(async () => {
      escuchar('SIGNED_OUT', null);
      return { error: null };
    });
    signInWithPassword.mockImplementation(async () => {
      escuchar('SIGNED_IN', { user });
      return { data: { user }, error: null };
    });
    signUp.mockImplementation(async () => {
      const session = confirmarCorreo ? null : { user };
      if (session) escuchar('SIGNED_IN', session);
      return { data: { user, session }, error: null };
    });
    const tabla = {
      select: vi.fn(() => tabla),
      eq: vi.fn(() => tabla),
      maybeSingle,
      single,
      upsert,
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Configuracion,
          useValue: { getConfiguracion: () => ({ porcentajePrimeraCompra: 20 }) },
        },
        {
          provide: Supabase,
          useValue: {
            cliente: {
              functions: { invoke: invocarGestion },
              from: vi.fn(() => tabla),
              auth: {
                signUp,
                signInWithPassword,
                signOut,
                onAuthStateChange: (callback: typeof escuchar) => {
                  escuchar = callback;
                  callback('INITIAL_SESSION', inicial);
                  return { data: { subscription: { unsubscribe } } };
                },
              },
            },
          },
        },
      ],
    });
  });

  it('ignora las cuentas demo de localStorage y no guarda contraseñas', async () => {
    localStorage.setItem(
      'cineplus_usuarios',
      JSON.stringify([{ rol: 'admin', contrasena: 'demo' }]),
    );
    service = TestBed.inject(Usuarios);
    await service.esperarSesion();
    expect(service.getUsuarioActual()).toBeUndefined();
    await service.iniciarSesion('  ANA@CINE.TEST ', 'ClaveDePrueba');
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@cine.test',
      password: 'ClaveDePrueba',
    });
    expect(service.getUsuarioActual()).not.toHaveProperty('contrasena');
    expect(JSON.stringify(localStorage)).not.toContain('ClaveDePrueba');
  });

  it('impide enviar altas de admin a una Edge Function antigua que siempre crea empleados', async () => {
    invocarGestion.mockResolvedValue({ data: { valido: true, perfiles: [] }, error: null });
    service = TestBed.inject(Usuarios);
    await service.getUsuarios();
    await expect(
      service.guardarEmpleado({
        nombre: 'Ana',
        apellido: 'Prueba',
        email: 'ana@cine.test',
        contrasena: 'Prueba123',
        rol: 'admin',
      }),
    ).rejects.toThrow(
      'La gestión de administradores no está disponible en este momento. Contactá al soporte del sistema.',
    );
    expect(invocarGestion).toHaveBeenCalledTimes(1);
  });

  it('no expone instrucciones de SQL enviadas por el servidor', async () => {
    invocarGestion.mockResolvedValue({
      data: { valido: false, mensaje: 'No se pudieron cargar las cuentas. Aplicá SQL 02.' },
      error: null,
    });
    service = TestBed.inject(Usuarios);
    await expect(service.getUsuarios()).rejects.toThrow(
      'No se pudo administrar las cuentas. Intentá nuevamente.',
    );
  });

  it('envía el rol seleccionado a la función actualizada y conserva el admin listado', async () => {
    invocarGestion.mockResolvedValue({
      data: {
        valido: true,
        perfiles: [{ ...perfilInicial, rol: 'admin' }],
        versionGestionCuentas: 2,
      },
      error: null,
    });
    service = TestBed.inject(Usuarios);
    const lista = await service.getUsuarios();
    expect(lista[0].rol).toBe('admin');
    const datos = {
      nombre: 'Luis',
      apellido: 'Prueba',
      email: 'luis@cine.test',
      contrasena: 'Prueba123',
      rol: 'admin' as const,
    };
    await service.guardarEmpleado(datos);
    expect(invocarGestion).toHaveBeenLastCalledWith('gestionar-empleados', {
      body: { accion: 'guardar', datos, id: undefined },
    });
  });

  it('espera el perfil antes de dar por restaurada la sesión', async () => {
    inicial = { user };
    let resolver!: (valor: { data: typeof perfil; error: null }) => void;
    maybeSingle.mockImplementationOnce(() => new Promise((resolve) => (resolver = resolve)));
    service = TestBed.inject(Usuarios);
    let termino = false;
    const esperando = service.esperarSesion().then(() => (termino = true));
    await vi.waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(termino).toBe(false);
    resolver({ data: perfil, error: null });
    await esperando;
    expect(service.getUsuarioActual()?.id).toBe(7);
  });

  it('con confirmación de correo no inventa una sesión ni crea el perfil todavía', async () => {
    confirmarCorreo = true;
    service = TestBed.inject(Usuarios);
    const resultado = await service.registrar(
      'Ana',
      'Pérez',
      'ana@cine.test',
      '1980-01-01',
      'ClaveDePrueba',
      '/pago',
    );
    expect(resultado.valido).toBe(true);
    expect(resultado.requiereConfirmacion).toBe(true);
    expect(service.getUsuarioActual()).toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toContain('returnUrl=%2Fpago');
  });

  it('crea el perfil como cliente, aunque los metadatos digan admin', async () => {
    perfil = undefined;
    service = TestBed.inject(Usuarios);
    const resultado = await service.registrar(
      'Ana',
      'Pérez',
      'ana@cine.test',
      '1980-01-01',
      'ClaveDePrueba',
    );
    expect(resultado.valido).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rol: 'cliente',
        primera_compra_realizada: false,
        auth_id: user.id,
      }),
      { onConflict: 'auth_id', ignoreDuplicates: true },
    );
    expect(service.getUsuarioActual()?.rol).toBe('cliente');
  });

  it('restaura el rol y la primera compra desde perfiles sin sobrescribirlos', async () => {
    inicial = { user };
    perfil = { ...perfilInicial, rol: 'admin', primera_compra_realizada: true };
    service = TestBed.inject(Usuarios);
    await service.esperarSesion();
    expect(service.getUsuarioActual()?.rol).toBe('admin');
    expect(service.tieneDescuentoPrimeraCompra()).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('descarta una carga que termina después de cerrar sesión', async () => {
    inicial = { user };
    let resolver!: (valor: { data: typeof perfil; error: null }) => void;
    maybeSingle.mockImplementationOnce(() => new Promise((resolve) => (resolver = resolve)));
    service = TestBed.inject(Usuarios);
    const esperando = service.esperarSesion();
    await vi.waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    await service.cerrarSesion();
    resolver({ data: perfil, error: null });
    await esperando;
    expect(service.getUsuarioActual()).toBeUndefined();
  });

  it('conserva la sesión si Supabase rechaza el cierre', async () => {
    service = TestBed.inject(Usuarios);
    await service.iniciarSesion('ana@cine.test', 'ClaveDePrueba');
    signOut.mockResolvedValueOnce({ error: { message: 'Sin conexión' } });
    expect(await service.cerrarSesion()).toBe(false);
    expect(service.getUsuarioActual()?.authId).toBe(user.id);
  });

  it('traduce el error de correo sin confirmar y permite volver a intentar', async () => {
    service = TestBed.inject(Usuarios);
    signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_not_confirmed' },
    });
    const error = await service.iniciarSesion('ana@cine.test', 'ClaveDePrueba');
    expect(error.valido).toBe(false);
    expect(error.mensaje).toContain('Confirmá');
    expect((await service.iniciarSesion('ana@cine.test', 'ClaveDePrueba')).valido).toBe(true);
  });
});
