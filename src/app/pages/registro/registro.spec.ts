import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { Registro } from './registro';
import { Usuarios } from '../../services/usuarios';

describe('Registro asincrónico', () => {
  const registrar = vi.fn();
  const navigateByUrl = vi.fn();
  let componente: Registro;
  beforeEach(() => {
    registrar.mockReset();
    navigateByUrl.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: Usuarios, useValue: { registrar } },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/pago' }) } },
        },
      ],
    });
    componente = TestBed.runInInjectionContext(() => new Registro());
    componente.formRegistro.setValue({
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@cine.test',
      fechaNacimiento: '01/01/1980',
      contrasena: 'ClaveDePrueba',
      confirmarContrasena: 'ClaveDePrueba',
    });
  });
  it('vuelve al pago después de crear una cuenta con sesión', async () => {
    registrar.mockResolvedValue({ valido: true, mensaje: 'Cuenta creada.' });
    await componente.registrar();
    expect(registrar).toHaveBeenCalledWith(
      'Ana',
      'Pérez',
      'ana@cine.test',
      '1980-01-01',
      'ClaveDePrueba',
      '/pago',
    );
    expect(navigateByUrl).toHaveBeenCalledWith('/pago');
  });
  it('no envía un email sin extensión ni un nombre compuesto solo por guiones o espacios', async () => {
    componente.email.setValue('Tomi@tomi');
    await componente.registrar();
    expect(componente.email.hasError('email')).toBe(true);
    expect(registrar).not.toHaveBeenCalled();
    componente.email.setValue('tomi@cine.test');
    for (const nombre of ['   ', '--', ' A ']) {
      componente.nombre.setValue(nombre);
      await componente.registrar();
      expect(componente.nombre.invalid).toBe(true);
      expect(registrar).not.toHaveBeenCalled();
    }
    componente.nombre.setValue('María-José');
    expect(componente.nombre.valid).toBe(true);
  });
  it('muestra la confirmación pendiente y no navega al pago sin sesión', async () => {
    registrar.mockResolvedValue({
      valido: true,
      mensaje: 'Confirmá el correo.',
      requiereConfirmacion: true,
    });
    await componente.registrar();
    expect(componente.registroExitoso).toBe(true);
    expect(componente.requiereConfirmacion).toBe(true);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
