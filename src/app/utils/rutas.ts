// Ambos formularios conservan el destino de la compra y evitan volver al login.
export function rutaDeRetorno(url: string | null): string {
  if (
    !url ||
    !url.startsWith('/') ||
    url.startsWith('//') ||
    url.includes('\\') ||
    /^\/(registro|inicio-sesion)(\/|\?|#|$)/.test(url)
  ) {
    return '/';
  }
  return url;
}
