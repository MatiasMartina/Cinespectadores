import { Supabase } from '../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { vi } from 'vitest';
import { adminGuard, empleadoGuard } from './roles-guard';
import { Usuarios } from '../services/usuarios';
import { Usuario } from '../models/usuario';

describe('Acceso por rol con sesión asincrónica', () => {
  const ruta = {} as ActivatedRouteSnapshot;
  const estado = { url: '/admin/funciones' } as RouterStateSnapshot;
  let usuario: Usuario | undefined;
  const esperarSesion = vi.fn();
  beforeEach(() => {
    usuario = undefined;
    esperarSesion.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Usuarios,
          useValue: { esperarSesion, getUsuarioActual: () => usuario },
        },
      ],
    });
  });
  const cuenta = (rol: Usuario['rol']): Usuario => ({
    id: 1,
    authId: 'uuid-de-prueba',
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@cine.test',
    fechaNacimiento: '1980-01-01',
    rol,
  });
  const ejecutarAdmin = () => TestBed.runInInjectionContext(() => adminGuard(ruta, estado));

  it('preserva el destino cuando el invitado tiene que iniciar sesión', async () => {
    expect(((await ejecutarAdmin()) as UrlTree).toString()).toBe(
      '/inicio-sesion?returnUrl=%2Fadmin%2Ffunciones',
    );
  });
  it('espera la restauración antes de decidir el acceso de un administrador', async () => {
    let resolver!: () => void;
    esperarSesion.mockImplementation(() => new Promise<void>((resolve) => (resolver = resolve)));
    const pendiente = ejecutarAdmin();
    usuario = cuenta('admin');
    resolver();
    expect(await pendiente).toBe(true);
  });
  it('permite validar a empleados pero les rechaza la administración', async () => {
    usuario = cuenta('empleado');
    expect(await TestBed.runInInjectionContext(() => empleadoGuard(ruta, estado))).toBe(true);
    expect(((await ejecutarAdmin()) as UrlTree).toString()).toBe('/');
  });
});
