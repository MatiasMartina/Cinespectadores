import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminActividad } from './admin-actividad';
import { Supabase } from '../../services/supabase';

describe('Fechas manuales en actividad', () => {
  it('compara las fechas en ISO y conserva los límites del día en Argentina', async () => {
    const tabla = {
      select: vi.fn(() => tabla),
      gte: vi.fn(() => tabla),
      lt: vi.fn(() => tabla),
      order: vi.fn(() => tabla),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    const from = vi.fn(() => tabla);
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: { cliente: { from } } }],
    });
    const component = TestBed.createComponent(AdminActividad).componentInstance;
    component.desde = '30/04/2030';
    component.hasta = '01/05/2030';
    await component.consultar();
    expect(tabla.gte).toHaveBeenCalledWith('fecha', '2030-04-30T00:00:00-03:00');
    expect(tabla.lt).toHaveBeenCalledWith('fecha', '2030-05-02T00:00:00-03:00');
    component.hasta = '29/04/2030';
    await component.consultar();
    expect(from).toHaveBeenCalledTimes(1);
    component.hasta = '31/04/2030';
    await component.consultar();
    expect(from).toHaveBeenCalledTimes(1);
  });
});
