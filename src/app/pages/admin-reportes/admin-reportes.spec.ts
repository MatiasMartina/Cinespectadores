import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminReportes } from './admin-reportes';
import { Reportes } from '../../services/reportes';
import { Exportaciones } from '../../services/exportaciones';

describe('Fechas manuales en facturación', () => {
  it('consulta la semana en ISO y rechaza una fecha inexistente sin conservar resultados anteriores', async () => {
    const getPeriodo = vi.fn(async (desde: string, hasta: string) => ({
      desde,
      hasta,
      dias: [],
      peliculas: [],
      productos: [],
    }));
    TestBed.configureTestingModule({
      providers: [
        { provide: Reportes, useValue: { getPeriodo } },
        { provide: Exportaciones, useValue: {} },
      ],
    });
    const component = TestBed.createComponent(AdminReportes).componentInstance;
    component.fecha = '15/04/2030';
    component.periodo = 'semana';
    await component.consultar();
    expect(getPeriodo).toHaveBeenCalledWith('2030-04-15', '2030-04-21');
    expect(component.reporte()).toBeDefined();
    component.fecha = '31/02/2030';
    await component.consultar();
    expect(getPeriodo).toHaveBeenCalledTimes(1);
    expect(component.reporte()).toBeUndefined();
    expect(component.mensaje()).toContain('dd/mm/aaaa');
  });
});
