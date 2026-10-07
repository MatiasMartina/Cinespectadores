import { TestBed } from '@angular/core/testing';
import type { User } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { Funcion } from '../models/funcion';
import { Pelicula } from '../models/pelicula';
import { Venta, SectorValidacion } from '../models/venta';
import { Funciones } from '../services/funciones';
import { Peliculas } from '../services/peliculas';
import { crearButacasSala } from '../utils/butacas-sala';
import { PRODUCTOS_INICIALES, CATEGORIAS_INICIALES } from '../data/candy-inicial';
import { CandyBar } from '../services/candy-bar';
import { Salas } from '../services/salas';
import { Configuracion } from '../services/configuracion';
import { Cupones } from '../services/cupones';
import { Beneficios } from '../services/beneficios';
import { cotizarCompra } from '../utils/cotizacion';
import { fechaLocal } from '../utils/fechas';

// Solo se importa desde archivos .spec.ts. Nunca conecta con Supabase real.
export function crearSupabaseDePrueba() {
  interface Perfil {
    id: number;
    auth_id: string;
    nombre: string;
    apellido: string;
    email: string;
    fecha_nacimiento: string;
    rol: 'cliente' | 'admin' | 'empleado';
    primera_compra_realizada: boolean;
    puntos?: number;
    credito?: number;
  }

  const perfiles = new Map<string, Perfil>();
  const cuentas = new Map<string, { user: User; password: string }>();
  const ocupadas = new Set<string>();
  const ventasGuardadas = new Map<string, Venta>();
  let escuchar: ((evento: string, sesion: { user: User } | null) => void) | undefined;
  let usuario: User | undefined;

  function crearCuenta(email: string, password: string, metadata: User['user_metadata']) {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      user_metadata: metadata,
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    cuentas.set(email, { user, password });
    return user;
  }

  for (const rol of ['admin', 'empleado'] as const) {
    const user = crearCuenta(`${rol}@cine.test`, 'Prueba123!', {});
    perfiles.set(user.id, {
      id: perfiles.size + 1,
      auth_id: user.id,
      nombre: rol,
      apellido: 'Prueba',
      email: user.email!,
      fecha_nacimiento: '1970-01-01',
      rol,
      primera_compra_realizada: true,
    });
  }

  const auth = {
    onAuthStateChange(callback: NonNullable<typeof escuchar>) {
      escuchar = callback;
      callback('INITIAL_SESSION', null);
      return {
        data: {
          subscription: {
            unsubscribe() {
              escuchar = undefined;
            },
          },
        },
      };
    },
    signUp: vi.fn(
      async (datos: {
        email: string;
        password: string;
        options: { data: User['user_metadata'] };
      }) => {
        usuario = crearCuenta(datos.email, datos.password, datos.options.data);
        escuchar?.('SIGNED_IN', { user: usuario });
        return { data: { user: usuario, session: { user: usuario } }, error: null };
      },
    ),
    signInWithPassword: vi.fn(async (datos: { email: string; password: string }) => {
      const cuenta = cuentas.get(datos.email);
      if (!cuenta || cuenta.password !== datos.password) {
        return { data: { user: null }, error: { code: 'invalid_credentials' } };
      }
      usuario = cuenta.user;
      escuchar?.('SIGNED_IN', { user: usuario });
      return { data: { user: usuario }, error: null };
    }),
    signOut: vi.fn(async () => {
      usuario = undefined;
      escuchar?.('SIGNED_OUT', null);
      return { error: null };
    }),
  };

  const fecha = fechaLocal(new Date(Date.now() + 3 * 86400000));
  const tablas: Record<string, Record<string, unknown>[]> = {
    peliculas: [
      {
        id: 1,
        nombre: 'Película +13',
        sinopsis: 'Prueba',
        duracion_minutos: 166,
        imagen_url: 'https://example.test/1.jpg',
        generos: ['Drama'],
        edad_minima: 13,
        cantidad_vendida: 0,
        en_cartelera: true,
      },
      {
        id: 2,
        nombre: 'Película ATP',
        sinopsis: 'Prueba',
        duracion_minutos: 96,
        imagen_url: 'https://example.test/2.jpg',
        generos: ['Animación'],
        edad_minima: 0,
        cantidad_vendida: 0,
        en_cartelera: true,
      },
    ],
    funciones: [
      {
        id: 1,
        pelicula_id: 1,
        fecha,
        hora: '18:00',
        sala_numero: 1,
        formato: '2D',
        idioma: 'Subtitulada',
        precio: 8000,
      },
      {
        id: 2,
        pelicula_id: 1,
        fecha,
        hora: '21:30',
        sala_numero: 2,
        formato: '3D',
        idioma: 'Castellano',
        precio: 9500,
      },
      {
        id: 3,
        pelicula_id: 2,
        fecha,
        hora: '16:00',
        sala_numero: 3,
        formato: '2D',
        idioma: 'Castellano',
        precio: 7000,
      },
      {
        id: 4,
        pelicula_id: 2,
        fecha,
        hora: '19:00',
        sala_numero: 3,
        formato: '3D',
        idioma: 'Castellano',
        precio: 8500,
      },
    ],
    salas: [1, 2, 3, 4].map((numero) => ({
      id: numero,
      numero,
      nombre: 'Sala ' + numero,
      activa: true,
      formatos: ['2D', '3D', '4D', '5D'],
      butacas: crearButacasSala(),
    })),
    categorias_candy: CATEGORIAS_INICIALES.map((c) => ({ ...c })),
    productos_candy: PRODUCTOS_INICIALES.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      imagen_url: p.imagenUrl,
      categoria_id: p.categoriaId,
      activo: true,
    })),
    configuracion: [{ id: 1, porcentaje_primera_compra: 20, extra_vip: 2000 }],
    cupones: [
      {
        id: 1,
        codigo: 'MAYORES50',
        descripcion: 'Mayores de 50',
        porcentaje_descuento: 15,
        edad_minima: 51,
        activo: true,
      },
    ],
    combos: [
      {
        id: 1,
        nombre: 'Entrada + pochoclos + bebida',
        precio: 12000,
        pochoclos_id: 1,
        bebida_id: 2,
        activo: true,
      },
    ],
    recompensas: [
      {
        id: 1,
        nombre: 'Entrada común gratis',
        tipo: 'entrada',
        producto_id: null,
        puntos: 500,
        activa: true,
      },
      {
        id: 2,
        nombre: 'Pochoclos gratis',
        tipo: 'producto',
        producto_id: 1,
        puntos: 150,
        activa: true,
      },
    ],
    resenas: [],
    movimientos_puntos: [],
  };
  const from = vi.fn((nombre: string) => {
    let filtros: [string, unknown][] = [];
    let accion = 'select';
    let valores: Record<string, unknown> | Record<string, unknown>[] = {};
    const ejecutar = async () => {
      if (nombre === 'perfiles') {
        const id = filtros.find(([c]) => c === 'auth_id')?.[1] as string;
        if (accion === 'upsert') {
          const d = valores as unknown as Omit<Perfil, 'id'>;
          if (!perfiles.has(d.auth_id))
            perfiles.set(d.auth_id, { ...d, id: perfiles.size + 1, puntos: 0 });
        }
        return { data: perfiles.get(id) ?? null, error: null };
      }
      if (nombre === 'butacas_ocupadas')
        return {
          data: [...ocupadas]
            .filter((k) => Number(k.split(':')[0]) === Number(filtros[0]?.[1]))
            .map((k) => ({ butaca_id: k.split(':')[1] })),
          error: null,
        };
      const lista = tablas[nombre];
      if (!lista) throw new Error('Tabla sin simular: ' + nombre);
      const coincide = (fila: Record<string, unknown>) => filtros.every(([c, v]) => fila[c] === v);
      if (accion !== 'select' && perfiles.get(usuario?.id ?? '')?.rol !== 'admin')
        return { data: null, error: { message: 'No tenés permiso para administrar.' } };
      if (accion === 'insert') {
        const nuevas = (Array.isArray(valores) ? valores : [valores]).map((v) => ({
          ...v,
          id: Math.max(0, ...lista.map((p) => Number(p['id']))) + 1,
        }));
        lista.push(...nuevas);
        return { data: nuevas, error: null };
      }
      if (accion === 'delete') {
        if (
          nombre === 'funciones' &&
          lista.some((f) => coincide(f) && [...ocupadas].some((k) => k.startsWith(f['id'] + ':')))
        )
          return { data: null, error: { message: 'La función tiene ventas.' } };
        tablas[nombre] = lista.filter((f) => !coincide(f));
        return { data: [], error: null };
      }
      if (accion === 'update') {
        if (
          nombre === 'salas' &&
          lista.some(
            (f) =>
              coincide(f) &&
              [...ocupadas].some((k) => {
                const funcion = tablas['funciones'].find(
                  (a) => a['id'] === Number(k.split(':')[0]),
                );
                if (funcion?.['sala_numero'] !== f['numero']) return false;
                const id = k.split(':')[1];
                const anteriores = f['butacas'] as { id: string }[];
                const nuevas = (valores as Record<string, unknown>)['butacas'] as
                  { id: string }[] | undefined;
                return (
                  nuevas &&
                  JSON.stringify(anteriores.find((b) => b.id === id)) !==
                    JSON.stringify(nuevas.find((b) => b.id === id))
                );
              }),
          )
        )
          return { data: null, error: { message: 'La butaca tiene ventas.' } };
        const editadas = lista.filter(coincide);
        editadas.forEach((f) => Object.assign(f, valores));
        return { data: editadas, error: null };
      }
      return { data: structuredClone(lista.filter(coincide)), error: null };
    };
    const tabla = {
      select: vi.fn(() => tabla),
      eq: vi.fn((c: string, v: unknown) => {
        filtros.push([c, v]);
        return tabla;
      }),
      order: vi.fn(() => tabla),
      insert: vi.fn((v: typeof valores) => {
        accion = 'insert';
        valores = v;
        return tabla;
      }),
      update: vi.fn((v: typeof valores) => {
        accion = 'update';
        valores = v;
        return tabla;
      }),
      delete: vi.fn(() => {
        accion = 'delete';
        return tabla;
      }),
      upsert: vi.fn((v: typeof valores) => {
        accion = 'upsert';
        valores = v;
        return ejecutar();
      }),
      single: vi.fn(async () => {
        const res = await ejecutar();
        return { ...res, data: Array.isArray(res.data) ? res.data[0] : res.data };
      }),
      maybeSingle: vi.fn(async () => {
        const res = await ejecutar();
        return { ...res, data: Array.isArray(res.data) ? (res.data[0] ?? null) : res.data };
      }),
      then: (resolver: (v: unknown) => unknown, rechazar: (e: unknown) => unknown) =>
        ejecutar().then(resolver, rechazar),
    };
    return tabla;
  });

  const rpc = vi.fn(
    async (
      nombre: string,
      datos: {
        p_datos?: {
          solicitud: string;
          funcionId: number;
          butacas: string[];
          productos: { productoId: number; cantidad: number }[];
          comboId?: number;
          cantidadCombos: number;
          canjes: { recompensaId: number; cantidad: number }[];
          nacimientoInvitado?: string;
          codigoCupon?: string;
          totalEsperado: number;
        };
        p_codigo?: string;
        p_sector?: SectorValidacion;
      },
    ): Promise<{ data: unknown; error: { code: string; message: string } | null }> => {
      const perfil = usuario && perfiles.get(usuario.id);
      if (nombre === 'confirmar_compra' && datos.p_datos) {
        const d = datos.p_datos;
        const funcion = tablas['funciones'].find((f) => f['id'] === d.funcionId);
        const pelicula = tablas['peliculas'].find((p) => p['id'] === funcion?.['pelicula_id']);
        const sala = tablas['salas'].find((s) => s['numero'] === funcion?.['sala_numero']);
        const disponibles = sala?.['butacas'] as {
          id: string;
          habilitada: boolean;
          tipo: string;
        }[];
        if (
          !funcion ||
          !pelicula ||
          !d.butacas.length ||
          new Set(d.butacas).size !== d.butacas.length ||
          d.butacas.some((id) => !disponibles.some((b) => b.id === id && b.habilitada))
        )
          return {
            data: null,
            error: { code: 'P0001', message: 'Revisá las butacas seleccionadas.' },
          };
        if (Number(pelicula['edad_minima']) > 0) {
          const nacimiento = perfil?.fecha_nacimiento ?? d.nacimientoInvitado;
          const edad = nacimiento
            ? Math.floor((Date.now() - new Date(nacimiento).getTime()) / (365.25 * 86400000))
            : 0;
          if (edad < Number(pelicula['edad_minima']))
            return { data: null, error: { code: 'P0001', message: 'No cumplís la edad mínima.' } };
        }
        const claves = d.butacas.map((id) => d.funcionId + ':' + id);
        if (claves.some((k) => ocupadas.has(k)))
          return { data: null, error: { code: '23505', message: 'Butaca ocupada.' } };
        const productos = tablas['productos_candy'].map((p) => ({
          id: Number(p['id']),
          nombre: String(p['nombre']),
          precio: Number(p['precio']),
          imagenUrl: String(p['imagen_url']),
          categoriaId: Number(p['categoria_id']),
          activo: Boolean(p['activo']),
        }));
        const combo = tablas['combos'].find((c) => c['id'] === d.comboId);
        const cupon = tablas['cupones'].find((c) => c['codigo'] === d.codigoCupon);
        const precio = cotizarCompra({
          precioEntrada: Number(funcion['precio']),
          cantidadEntradas: d.butacas.length,
          cantidadVip: d.butacas.filter(
            (id) => disponibles.find((b) => b.id === id)?.tipo === 'VIP',
          ).length,
          extraVip: 2000,
          productos,
          items: d.productos.map((i) => {
            const p = productos.find((p) => p.id === i.productoId)!;
            return {
              productoId: p.id,
              nombre: p.nombre,
              cantidad: i.cantidad,
              precioUnitario: p.precio,
              subtotal: p.precio * i.cantidad,
            };
          }),
          combo: combo
            ? {
                id: Number(combo['id']),
                nombre: String(combo['nombre']),
                precio: Number(combo['precio']),
                pochoclosId: Number(combo['pochoclos_id']),
                bebidaId: Number(combo['bebida_id']),
                activo: Boolean(combo['activo']),
              }
            : undefined,
          cantidadCombos: d.cantidadCombos,
          recompensas: tablas['recompensas'].map((r) => ({
            id: Number(r['id']),
            nombre: String(r['nombre']),
            tipo: r['tipo'] as 'entrada' | 'producto',
            productoId: r['producto_id'] === null ? undefined : Number(r['producto_id']),
            puntos: Number(r['puntos']),
            activa: Boolean(r['activa']),
          })),
          canjes: d.canjes,
          puntosDisponibles: perfil?.puntos ?? 0,
          porcentajePrimeraCompra: perfil && !perfil.primera_compra_realizada ? 20 : 0,
          porcentajeCupon: Number(cupon?.['porcentaje_descuento'] ?? 0),
        });
        if (precio.total !== d.totalEsperado)
          return { data: null, error: { code: 'P0001', message: 'El total cambió.' } };
        const codigo = 'CINE-' + crypto.randomUUID().toUpperCase();
        const venta: Venta = {
          fechaCompra: new Date().toISOString(),
          entrada: {
            codigo,
            funcionId: d.funcionId,
            peliculaId: Number(pelicula['id']),
            pelicula: String(pelicula['nombre']),
            fecha: String(funcion['fecha']),
            hora: String(funcion['hora']),
            salaNumero: Number(funcion['sala_numero']),
            formato: String(funcion['formato']),
            idioma: String(funcion['idioma']),
            butacas: d.butacas,
            productosCandy: precio.productosCandy,
            total: precio.total,
            subtotal: precio.subtotal,
            beneficio:
              Math.max(precio.descuentoPrimeraCompra, precio.descuentoCupon) === 0
                ? ''
                : precio.descuentoPrimeraCompra >= precio.descuentoCupon
                  ? 'Primera compra'
                  : 'Cupón ' + d.codigoCupon,
            puntosGanados: perfil ? precio.total : 0,
            puntosUsados: precio.puntosUsados,
          },
        };
        if (perfil) {
          perfil.primera_compra_realizada = true;
          perfil.puntos = (perfil.puntos ?? 0) + precio.total - precio.puntosUsados;
          venta.usuarioId = perfil.id;
        }
        claves.forEach((k) => ocupadas.add(k));
        ventasGuardadas.set(codigo, venta);
        return { data: structuredClone(venta), error: null };
      }
      if (nombre === 'buscar_venta_por_codigo' || nombre === 'validar_venta_por_codigo') {
        if (!perfil || !['admin', 'empleado'].includes(perfil.rol)) {
          return {
            data: null,
            error: { code: '42501', message: 'Se necesita una cuenta de empleado.' },
          };
        }
        const venta = ventasGuardadas.get(datos.p_codigo ?? '');
        if (nombre === 'buscar_venta_por_codigo') {
          return { data: venta ? structuredClone(venta) : null, error: null };
        }
        if (!venta)
          return {
            data: { valido: false, mensaje: 'El código no pertenece a una compra registrada.' },
            error: null,
          };
        const campo = datos.p_sector === 'cine' ? 'ingreso' : 'candy';
        if (venta[campo])
          return {
            data: {
              valido: false,
              venta: structuredClone(venta),
              mensaje: 'Esta compra ya fue utilizada en ese sector.',
            },
            error: null,
          };
        if (campo === 'candy' && venta.entrada.productosCandy.length === 0) {
          return {
            data: {
              valido: false,
              venta: structuredClone(venta),
              mensaje: 'Esta compra no incluye productos del Candy Bar.',
            },
            error: null,
          };
        }
        venta[campo] = { empleadoId: perfil.id, fecha: new Date().toISOString() };
        return {
          data: {
            valido: true,
            venta: structuredClone(venta),
            mensaje: campo === 'ingreso' ? 'Entrada validada.' : 'Entrega confirmada.',
          },
          error: null,
        };
      }
      throw new Error(`RPC sin simular: ${nombre}`);
    },
  );

  const canal = { on: vi.fn(() => canal), subscribe: vi.fn(() => canal) };
  return {
    cliente: { auth, from, rpc, channel: vi.fn(() => canal), removeChannel: vi.fn() },
    ocupadas,
    ventasGuardadas,
    tablas,
    perfiles,
  };
}

export async function prepararCatalogoDePrueba(): Promise<Funcion> {
  await Promise.all([
    TestBed.inject(Funciones).cargar(),
    TestBed.inject(Peliculas).cargar(),
    TestBed.inject(Salas).cargar(),
    TestBed.inject(CandyBar).cargar(),
    TestBed.inject(Configuracion).cargar(),
    TestBed.inject(Cupones).cargar(),
    TestBed.inject(Beneficios).cargar(),
  ]);
  return TestBed.inject(Funciones).getFuncionPorId(3)!;
}
