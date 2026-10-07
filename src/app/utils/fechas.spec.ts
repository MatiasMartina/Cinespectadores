import { FormControl } from '@angular/forms';
import { fechaManualIso, fechaParaMostrar } from './fechas';
import { validarFechaManual, validarHoraManual } from './validadores-fecha';

describe('Fechas y horas manuales', () => {
  it('admite años bisiestos, convierte sin cambiar el día y permite fechas futuras', () => {
    expect(fechaManualIso('29/02/2028')).toBe('2028-02-29');
    expect(fechaParaMostrar('2030-12-31')).toBe('31/12/2030');
    for (const valor of [
      '31/02/2028',
      '29/02/2027',
      '01/13/2030',
      '00/01/2030',
      '2030-01-01',
      '1/1/2030',
    ]) {
      expect(fechaManualIso(valor)).toBeUndefined();
    }
  });
  it('valida límites sin corregir el texto y no exige fecha en un campo opcional', () => {
    const control = new FormControl(
      '',
      validarFechaManual(() => '2030-01-01'),
    );
    expect(control.valid).toBe(true);
    control.setValue('31/02/2030');
    expect(control.invalid).toBe(true);
    expect(control.value).toBe('31/02/2030');
    control.setValue('31/12/2029');
    expect(control.hasError('fechaMinima')).toBe(true);
    control.setValue('01/01/2030');
    expect(control.valid).toBe(true);
  });
  it('valida horas de 24 horas con dos dígitos', () => {
    const control = new FormControl('00:00', validarHoraManual);
    expect(control.valid).toBe(true);
    control.setValue('23:59');
    expect(control.valid).toBe(true);
    for (const hora of ['24:00', '10:60', '9:30', '12:3', '1800']) {
      control.setValue(hora);
      expect(control.invalid).toBe(true);
    }
  });
});
