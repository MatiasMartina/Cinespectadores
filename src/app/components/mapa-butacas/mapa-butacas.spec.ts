import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MapaButacas } from './mapa-butacas';
import { FilaButacas } from '../../models/fila-butacas';

const filas: FilaButacas[] = [
  {
    nombre: 'A',
    butacas: [
      { id: 'A-1', fila: 'A', numero: 1, tipo: 'Comun' },
      { id: 'A-2', fila: 'A', numero: 2, tipo: 'VIP' },
    ],
  },
];

describe('MapaButacas', () => {
  let fixture: ComponentFixture<MapaButacas>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
      imports: [MapaButacas],
    }).compileComponents();
    fixture = TestBed.createComponent(MapaButacas);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('butacasSeleccionadas', ['A-2']);
    await fixture.whenStable();
  });
  it('conserva la selección interactiva usada durante la compra', () => {
    const recibido = vi.fn();
    fixture.componentInstance.butacaElegida.subscribe(recibido);
    fixture.nativeElement.querySelector('button').click();
    expect(recibido).toHaveBeenCalledWith(filas[0].butacas[0]);
  });
  it('marca las ubicaciones y evita modificarlas en modo de consulta', async () => {
    const recibido = vi.fn();
    fixture.componentInstance.butacaElegida.subscribe(recibido);
    fixture.componentRef.setInput('soloLectura', true);
    await fixture.whenStable();
    const seleccionada = fixture.nativeElement.querySelector('button.seleccionada');
    expect(seleccionada.getAttribute('aria-label')).toContain('A-2');
    expect(seleccionada.disabled).toBe(true);
    seleccionada.click();
    fixture.componentInstance.elegirButaca(filas[0].butacas[1]);
    expect(recibido).not.toHaveBeenCalled();
  });
  it('también destaca las butacas seleccionadas en el mapa compacto', async () => {
    fixture.componentRef.setInput('compacto', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.mini-asiento.seleccionada').title).toBe(
      'Butaca A-2',
    );
  });
});
