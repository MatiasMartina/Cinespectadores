// Los detalles del servidor no se muestran como instrucciones al usuario.
export function mensajeServidor(error: unknown, alternativa: string): string {
  const datos =
    error && typeof error === 'object'
      ? (error as { code?: string; message?: unknown })
      : undefined;
  if (datos?.code === '42501') return 'No tenés permiso para realizar esta operación.';
  if (datos?.code === '23505')
    return 'Ya existe un registro con esos datos. Revisalos antes de continuar.';
  if (datos?.code === '23503')
    return 'No se pudo completar la operación porque hay datos relacionados. Revisalos antes de continuar.';
  const mensaje = typeof error === 'string' ? error : datos?.message;
  if (typeof mensaje !== 'string') return alternativa;
  if (
    /\b(sql\s*\d*|supabase|postgres\w*|pgrst\w*|rpc|schema|constraint|relation|column|table|permission denied|function|stack|fetch|jwt|api|gestionar-empleados)\b|\b(?:tabla|migraci[oó]n|edge function)\b|[a-z]+_[a-z]+/i.test(
      mensaje,
    )
  )
    return alternativa;
  // Se conservan validaciones de negocio redactadas para la interfaz.
  return /^(?:No |La |El |Los |Las |Una? |Ese |Esa |Este |Esta |Ya |Solo |S[oó]lo |Ingres[aá] |Eleg[ií] |Revis[aá] |Complet[aá] |Inici[aá] |Se |Ten[eé]s |Esper[aá] |Confirm[aá] |Faltan |Falta |Cada |Datos |Esta |Hay |Necesit[aá]s |Seleccion[aá] |Todos |Todas |Cantidad |Saldo |Puntos |Cup[oó]n |Producto |Recompensa |Butaca |Operaci[oó]n )/.test(
    mensaje.trim(),
  )
    ? mensaje.trim()
    : alternativa;
}
