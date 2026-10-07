import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { InicioSesion } from './inicio-sesion';
import { Usuarios } from '../../services/usuarios';

describe('Inicio de sesión asincrónico', () => {
  const iniciarSesion = vi.fn();
  const navigateByUrl = vi.fn();
  let componente: InicioSesion;
  beforeEach(async () => {
    iniciarSesion.mockReset();
    navigateByUrl.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Usuarios,
          useValue: {
            iniciarSesion,
            esperarSesion: async () => undefined,
            getUsuarioActual: () => undefined,
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/pago' }) } },
        },
      ],
    });
    componente = TestBed.runInInjectionContext(() => new InicioSesion());
    await componente.ngOnInit();
    componente.formInicioSesion.setValue({ email: 'ana@cine.test', contrasena: 'ClaveDePrueba' });
  });
  it('espera el resultado de Auth y vuelve al destino de la compra', async () => {
    iniciarSesion.mockResolvedValue({ valido: true, mensaje: 'Sesión iniciada.' });
    await componente.iniciarSesion();
    expect(navigateByUrl).toHaveBeenCalledWith('/pago');
  });
  it('muestra el error sin redirigir cuando Auth rechaza el ingreso', async () => {
    iniciarSesion.mockResolvedValue({
      valido: false,
      mensaje: 'El email o la contraseña son incorrectos.',
    });
    await componente.iniciarSesion();
    expect(componente.mensajeError).toContain('incorrectos');
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
