import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { Ventas } from './ventas';
import { CandyBar } from './candy-bar';
import { Usuarios } from './usuarios';
import { Cupones } from './cupones';
import { Compra } from './compra';
import { Administracion } from './administracion';
import { Funciones } from './funciones';
import { Salas } from './salas';
import { Butacas } from './butacas';

describe('Compras y validaciones', () => {
  let ventas: Ventas;
  let usuarios: Usuarios;
  let supabase: ReturnType<typeof crearSupabaseDePrueba>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    supabase = crearSupabaseDePrueba();
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: supabase }],
    });
    await prepararCatalogoDePrueba();
    usuarios = TestBed.inject(Usuarios);
    await usuarios.esperarSesion();
    ventas = TestBed.inject(Ventas);
  });

  afterEach(() => vi.restoreAllMocks());

  it('permite comprar como invitado, guarda el Candy Bar y evita revender la misma butaca', async () => {
    const candy = TestBed.inject(CandyBar);
    candy.agregarProducto(1);
    candy.agregarProducto(1);
    const primera = await ventas.confirmarCompra(3, ['A-4']);
    expect(primera.valido).toBe(true);
    expect(primera.venta!.usuarioId).toBeUndefined();
    expect(primera.venta!.entrada.productosCandy[0].cantidad).toBe(2);
    expect(candy.getCantidadTotal()).toBe(0);
    expect(supabase.ventasGuardadas.size).toBe(1);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const repetida = await ventas.confirmarCompra(3, ['A-4']);
    expect(repetida.valido).toBe(false);
    expect(repetida.mensaje).toContain('ocupada');
    expect([...supabase.ventasGuardadas.values()]).toHaveLength(1);
  });

  it('solo aprueba una de dos compras simultáneas de la misma butaca', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const resultados = await Promise.all([
      ventas.confirmarCompra(3, ['A-4']),
      ventas.confirmarCompra(3, ['A-4']),
    ]);
    expect(resultados.filter((resultado) => resultado.valido).length).toBe(1);
    expect([...supabase.ventasGuardadas.values()]).toHaveLength(1);
    expect(supabase.ocupadas.size).toBe(1);
  });

  it('revalida la edad al pagar y rechaza una selección duplicada o inválida', async () => {
    expect((await ventas.confirmarCompra(1, ['A-4'])).valido).toBe(false);
    TestBed.inject(Compra).guardarFechaNacimientoInvitado(`01/01/${new Date().getFullYear() - 8}`);
    expect((await ventas.confirmarCompra(1, ['A-4'])).valido).toBe(false);
    TestBed.inject(Compra).guardarFechaNacimientoInvitado(`01/01/${new Date().getFullYear() - 30}`);
    expect((await ventas.confirmarCompra(1, ['A-4'])).valido).toBe(true);
    expect((await ventas.confirmarCompra(3, ['A-5', 'A-5'])).valido).toBe(false);
    expect((await ventas.confirmarCompra(3, ['Z-999'])).valido).toBe(false);
  });

  it('cada sector acepta el código una sola vez, incluso tras volver a buscarlo', async () => {
    TestBed.inject(CandyBar).agregarProducto(1);
    const resultado = await ventas.confirmarCompra(3, ['A-4']);
    expect(resultado.valido).toBe(true);
    const venta = resultado.venta!;
    expect((await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!')).valido).toBe(true);
    const codigo = venta.entrada.codigo;
    expect((await ventas.validarCodigo(codigo, 'cine')).valido).toBe(true);
    expect((await ventas.validarCodigo(codigo, 'cine')).valido).toBe(false);
    expect((await ventas.validarCodigo(codigo, 'candy')).valido).toBe(true);
    expect((await ventas.validarCodigo(codigo, 'candy')).valido).toBe(false);
    expect(supabase.ventasGuardadas.get(codigo)!.ingreso!.empleadoId).toBe(
      usuarios.getUsuarioActual()!.id,
    );
  });

  it('rechaza códigos inventados, validadores sin rol y entregas sin productos', async () => {
    const resultado = await ventas.confirmarCompra(3, ['A-4']);
    expect(resultado.valido).toBe(true);
    const venta = resultado.venta!;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await ventas.validarCodigo(venta.entrada.codigo, 'cine')).valido).toBe(false);
    expect((await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!')).valido).toBe(true);
    expect((await ventas.validarCodigo('CINE-INVENTADO', 'cine')).valido).toBe(false);
    expect((await ventas.validarCodigo(venta.entrada.codigo, 'candy')).valido).toBe(false);
    expect(await ventas.buscarCodigo(JSON.stringify({ ...venta.entrada, total: 0 }))).toEqual(
      venta,
    );
  });

  it('usa el mejor cupón, consume la primera compra y mantiene el cupón por edad en compras siguientes', async () => {
    const registro = await usuarios.registrar(
      'Ana',
      'Pérez',
      'ana@cine.test',
      '1970-01-01',
      'Prueba123!',
    );
    expect(registro.valido).toBe(true);
    const cupones = TestBed.inject(Cupones);
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    await cupones.guardarCupon({
      codigo: 'MAYOR30',
      descripcion: 'Mayores',
      porcentajeDescuento: 30,
      edadMinima: 51,
      activo: true,
    });
    await usuarios.iniciarSesion('ana@cine.test', 'Prueba123!');
    const primera = await ventas.confirmarCompra(3, ['A-4'], 'MAYOR30');
    expect(primera.valido).toBe(true);
    expect(primera.venta!.entrada.total).toBe(4900);
    expect(primera.venta!.entrada.beneficio).toBe('Cupón MAYOR30');
    expect(usuarios.tieneDescuentoPrimeraCompra()).toBe(false);
    const segunda = await ventas.confirmarCompra(3, ['A-5'], 'MAYOR30');
    expect(segunda.valido).toBe(true);
    expect(segunda.venta!.entrada.total).toBe(4900);
    expect(segunda.venta!.entrada.beneficio).toBe('Cupón MAYOR30');
  });

  it('no ocupa butacas si el cupón ya no es válido o cambió el total mostrado', async () => {
    expect((await ventas.confirmarCompra(3, ['A-4'], 'NOEXISTE')).valido).toBe(false);
    expect((await ventas.confirmarCompra(3, ['A-4'], undefined, 1)).valido).toBe(false);
    expect(supabase.ventasGuardadas.size).toBe(0);
    expect(supabase.cliente.rpc).not.toHaveBeenCalled();
    expect(supabase.ocupadas.size).toBe(0);
  });

  it('protege funciones y butacas vendidas y valida cambios de duración', async () => {
    const admin = TestBed.inject(Administracion);
    expect((await ventas.confirmarCompra(3, ['A-4'])).valido).toBe(true);
    expect((await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!')).valido).toBe(true);
    expect(await admin.eliminarFuncion(3)).not.toBe('');
    expect(await admin.actualizarButacas(3, ['A-4'], 'VIP', false)).not.toBe('');
    expect(TestBed.inject(Funciones).duracionDisponible(2, 360)).toBe(false);
    expect(await admin.actualizarButacas(1, ['A-4'], 'VIP', true)).toBe('');
    expect(TestBed.inject(Butacas).getPrecioButaca(8000, 'A-4', 1)).toBe(10000);
    expect(TestBed.inject(Butacas).getPrecioButaca(8000, 'A-4', 2)).toBe(8000);
    expect(TestBed.inject(Salas).getSala(1)!.butacas.length).toBe(518);
  });

  it('impide cambios del admin cuando inicia sesión un cliente o empleado', async () => {
    const admin = TestBed.inject(Administracion);
    expect(await admin.guardarCategoria('Prueba')).not.toBe('');
    expect(
      (await usuarios.registrar('Ana', 'Pérez', 'ana@cine.test', '1970-01-01', 'Prueba123!'))
        .valido,
    ).toBe(true);
    expect(await admin.guardarCategoria('Prueba')).not.toBe('');
    expect((await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!')).valido).toBe(true);
    expect(await admin.guardarCategoria('Prueba')).not.toBe('');
    expect((await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!')).valido).toBe(true);
    expect(await admin.guardarCategoria('Prueba')).toBe('');
  });

  it('usa la primera compra cuando supera al cupón y no la repite', async () => {
    expect(
      (await usuarios.registrar('Ana', 'Pérez', 'ana@cine.test', '1970-01-01', 'Prueba123!'))
        .valido,
    ).toBe(true);
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    await TestBed.inject(Cupones).guardarCupon({
      codigo: 'MAYOR15',
      descripcion: 'Mayores',
      porcentajeDescuento: 15,
      edadMinima: 51,
      activo: true,
    });
    await usuarios.iniciarSesion('ana@cine.test', 'Prueba123!');
    const primera = await ventas.confirmarCompra(3, ['A-4'], 'MAYOR15');
    expect(primera.valido).toBe(true);
    expect(primera.venta!.entrada.total).toBe(5600);
    expect(primera.venta!.entrada.beneficio).toBe('Primera compra');
    expect(usuarios.tieneDescuentoPrimeraCompra()).toBe(false);
    const segunda = await ventas.confirmarCompra(3, ['A-5'], 'MAYOR15');
    expect(segunda.valido).toBe(true);
    expect(segunda.venta!.entrada.total).toBe(5950);
    expect(segunda.venta!.entrada.beneficio).toBe('Cupón MAYOR15');
  });

  it('conserva el borrador y el Candy Bar cuando Supabase rechaza la compra', async () => {
    const funcion = TestBed.inject(Funciones).getFuncionPorId(3)!;
    const compra = TestBed.inject(Compra);
    const candy = TestBed.inject(CandyBar);
    compra.guardarCompra(funcion, ['A-4']);
    candy.agregarProducto(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.cliente.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'Fallo simulado.' },
    });
    const resultado = await ventas.confirmarCompra(3, ['A-4']);
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toBe(
      'No se pudo confirmar la compra. Revisá su estado antes de volver a intentarlo.',
    );
    expect([...supabase.ventasGuardadas.values()]).toHaveLength(0);
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    expect(candy.getCantidadTotal()).toBe(1);
    expect(supabase.ocupadas.size).toBe(0);
  });

  it('encuentra y valida una compra aunque no exista en el almacenamiento del empleado', async () => {
    const compra = await ventas.confirmarCompra(3, ['A-4']);
    expect(compra.valido).toBe(true);
    localStorage.removeItem('cineplus_ventas');
    expect(supabase.ventasGuardadas.size).toBe(1);
    await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!');
    const encontrada = await ventas.buscarCodigo(
      `  ${compra.venta!.entrada.codigo.toLowerCase()}  `,
    );
    expect(encontrada?.entrada.total).toBe(7000);
    expect((await ventas.validarCodigo(encontrada!.entrada.codigo, 'cine')).valido).toBe(true);
    localStorage.removeItem('cineplus_ventas');
    expect((await ventas.buscarCodigo(encontrada!.entrada.codigo))?.ingreso).toBeTruthy();
    expect((await ventas.validarCodigo(encontrada!.entrada.codigo, 'cine')).valido).toBe(false);
  });

  it('solo acepta una de dos validaciones de ingreso y conserva pendiente la entrega', async () => {
    TestBed.inject(CandyBar).agregarProducto(1);
    const codigo = (await ventas.confirmarCompra(3, ['A-4'])).venta!.entrada.codigo;
    await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!');
    const resultados = await Promise.all([
      ventas.validarCodigo(codigo, 'cine'),
      ventas.validarCodigo(codigo, 'cine'),
    ]);
    expect(resultados.filter((resultado) => resultado.valido)).toHaveLength(1);
    const encontrada = await ventas.buscarCodigo(codigo);
    expect(encontrada?.ingreso).toBeTruthy();
    expect(encontrada?.candy).toBeUndefined();
    expect((await ventas.validarCodigo(codigo, 'candy')).valido).toBe(true);
  });

  it('Supabase rechaza un cliente aunque el rol local se altere a admin', async () => {
    const codigo = (await ventas.confirmarCompra(3, ['A-4'])).venta!.entrada.codigo;
    await usuarios.registrar('Ana', 'Pérez', 'ana@cine.test', '1970-01-01', 'Prueba123!');
    usuarios.getUsuarioActual()!.rol = 'admin';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(ventas.buscarCodigo(codigo)).rejects.toThrow('cuenta de empleado');
    expect((await ventas.validarCodigo(codigo, 'cine')).valido).toBe(false);
    expect(supabase.ventasGuardadas.get(codigo)?.ingreso).toBeUndefined();
  });

  it('un error de validación no marca la copia local ni la venta remota como utilizada', async () => {
    const codigo = (await ventas.confirmarCompra(3, ['A-4'])).venta!.entrada.codigo;
    await usuarios.iniciarSesion('empleado@cine.test', 'Prueba123!');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.cliente.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'XX000', message: 'Fallo simulado.' },
    });
    expect((await ventas.validarCodigo(codigo, 'cine')).valido).toBe(false);
    expect(supabase.ventasGuardadas.get(codigo)?.ingreso).toBeUndefined();
    expect(supabase.ventasGuardadas.get(codigo)?.ingreso).toBeUndefined();
  });

  it('rechaza un QR JSON roto sin consultar Supabase', async () => {
    expect(await ventas.buscarCodigo('{"codigo":')).toBeUndefined();
    expect((await ventas.validarCodigo('{"codigo":', 'cine')).valido).toBe(false);
    expect(supabase.cliente.rpc).not.toHaveBeenCalled();
  });
});
