export function fechaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function fechaHoraValida(fecha: string, hora = '00:00'): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return undefined;
  }
  const resultado = new Date(`${fecha}T${hora}:00`);
  if (!Number.isFinite(resultado.getTime()) || fechaLocal(resultado) !== fecha) {
    return undefined;
  }
  return resultado.getTime();
}

// La interfaz usa día/mes/año; Supabase sigue recibiendo ISO.
export function fechaManualIso(valor: string): string | undefined {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!partes) return undefined;
  const iso = `${partes[3]}-${partes[2]}-${partes[1]}`;
  return fechaHoraValida(iso) === undefined ? undefined : iso;
}

export function fechaParaMostrar(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

export function nacimientoIso(valor: string): string | undefined {
  const formato = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const iso = formato ? `${formato[3]}-${formato[2]}-${formato[1]}` : valor;
  const tiempo = fechaHoraValida(iso);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (tiempo === undefined || iso < '1900-01-01' || tiempo > hoy.getTime()) {
    return undefined;
  }
  return iso;
}

// Se comparte entre el registro y la compra como invitado.
export function formatearNacimiento(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  let dia = numeros.slice(0, 2);
  let mes = numeros.slice(2, 4);
  let anio = numeros.slice(4, 8);
  const limitar = (valor: string, maximo: number, minimo = 1) =>
    String(Math.min(Math.max(Number(valor), minimo), maximo)).padStart(valor.length, '0');
  if (dia.length === 2) dia = limitar(dia, 31);
  if (mes.length === 2) mes = limitar(mes, 12);
  if (dia.length === 2 && mes.length === 2) {
    dia = limitar(dia, new Date(2000, Number(mes), 0).getDate());
  }
  if (anio.length === 4) {
    const hoy = new Date();
    anio = limitar(anio, hoy.getFullYear(), 1900);
    dia = limitar(dia, new Date(Number(anio), Number(mes), 0).getDate());
    if (new Date(Number(anio), Number(mes) - 1, Number(dia)) > hoy) {
      dia = String(hoy.getDate()).padStart(2, '0');
      mes = String(hoy.getMonth() + 1).padStart(2, '0');
      anio = String(hoy.getFullYear());
    }
  }
  return dia + (numeros.length > 2 ? `/${mes}` : '') + (numeros.length > 4 ? `/${anio}` : '');
}
