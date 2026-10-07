import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AdminFunciones } from './admin-funciones';
import { Funciones } from '../../services/funciones';
import { Peliculas } from '../../services/peliculas';
import { Salas } from '../../services/salas';
import { Administracion } from '../../services/administracion';
import { Funcion } from '../../models/funcion';

describe('Administración de funciones', () => {
  const base: Funcion = {
    id: 1,
    peliculaId: 10,
    salaNumero: 2,
    fecha: '2030-04-15',
    hora: '18:00',
    formato: '2D',
    idioma: 'Castellano',
    precio: 8000,
  };
  let component: AdminFunciones;
  const guardarFuncion = vi.fn(),
    programarSemana = vi.fn(),
    eliminarFuncion = vi.fn();
  let funciones: ReturnType<typeof signal<Funcion[]>>;
  beforeEach(() => {
    vi.resetAllMocks();
    funciones = signal([
      base,
      { ...base, id: 2, fecha: '2030-04-16', formato: '3D' },
      { ...base, id: 3, peliculaId: 11, salaNumero: 1, fecha: '2030-05-01' },
    ]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Funciones,
          useValue: { cargar: async () => {}, getFunciones: () => funciones() },
        },
        {
          provide: Peliculas,
          useValue: {
            cargar: async () => {},
            getTodasLasPeliculas: () => [],
            getPeliculaPorId: (id: number) => ({
              nombre: id === 10 ? 'Luna' : 'Sol',
              duracionMinutos: 90,
            }),
          },
        },
        { provide: Salas, useValue: { cargar: async () => {}, getSalas: () => [] } },
        { provide: Administracion, useValue: { guardarFuncion, programarSemana, eliminarFuncion } },
      ],
    });
    component = TestBed.createComponent(AdminFunciones).componentInstance;
  });
  it('combina nombre, sala, formato y semana; una fecha inválida no muestra todas', () => {
    component.busqueda.set('lUnA');
    component.sala.set('2');
    component.formatoFiltro.set('3D');
    component.fechaFiltro.set('15/04/2030');
    component.periodo.set('semana');
    expect(component.filtradas().map((f) => f.id)).toEqual([2]);
    component.fechaFiltro.set('31/02/2030');
    expect(component.filtradas()).toEqual([]);
    component.limpiarFiltros();
    component.fechaFiltro.set('15/04/2030');
    component.periodo.set('mes');
    expect(component.filtradas().map((f) => f.id)).toEqual([1, 2]);
  });
  it('rechaza día inexistente y hora inválida antes de guardar; convierte una fecha real a ISO', async () => {
    component.formulario.patchValue({ peliculaId: 10, fecha: '31/02/2030', hora: '25:00' });
    await component.guardar();
    expect(guardarFuncion).not.toHaveBeenCalled();
    component.formulario.patchValue({ fecha: '15/04/2030', hora: '18:00' });
    guardarFuncion.mockResolvedValue({ valido: true, mensaje: 'Guardada', funciones: [] });
    await component.guardar();
    expect(guardarFuncion).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: '2030-04-15', hora: '18:00' }),
      undefined,
    );
  });
  it('no envía un rango invertido ni un lote sin días; mantiene ISO en el lote válido', async () => {
    component.modo = 'semanal';
    component.formulario.patchValue({ peliculaId: 10, fecha: '15/04/2030', hasta: '14/04/2030' });
    component.dias = [1];
    await component.guardar();
    expect(programarSemana).not.toHaveBeenCalled();
    component.formulario.controls.hasta.setValue('21/04/2030');
    component.dias = [];
    await component.guardar();
    expect(programarSemana).not.toHaveBeenCalled();
    component.dias = [1, 2];
    programarSemana.mockResolvedValue({ valido: true, mensaje: 'Guardadas', funciones: [] });
    await component.guardar();
    expect(programarSemana).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: '2030-04-15' }),
      '2030-04-15',
      '2030-04-21',
      [1, 2],
    );
  });
  it('elimina solo seleccionadas visibles y conserva las protegidas con su error', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.seleccionadas.set([1, 2, 3]);
    component.sala.set('2');
    eliminarFuncion.mockImplementation(async (id: number) => {
      if (id === 2) return 'Tiene ventas.';
      funciones.update((fs) => fs.filter((f) => f.id !== id));
      return '';
    });
    await component.eliminarSeleccionadas();
    expect(eliminarFuncion.mock.calls.map((c) => c[0])).toEqual([1, 2]);
    expect(component.seleccionadas()).toEqual([2, 3]);
    expect(component.mensaje()).toContain('Tiene ventas.');
    expect(component.error()).toBe(true);
  });
});
