# Cinespectadores

Trabajo práctico de Programación IV: cine desarrollado con Angular 22 y Supabase. Incluye cartelera, funciones, butacas, Candy Bar, pago simulado, entradas PDF/QR, puntos, administración y validación de compras.

Firebase Hosting publica la aplicación web. Supabase mantiene las cuentas, los datos y las operaciones de compra.

## Desarrollo

Usar Node 24.15 o superior de la rama 24 y npm. Desde la carpeta del proyecto:

```sh
npm ci
npm start
```

Abrir `http://localhost:4200/`. La conexión pública con Supabase está en `src/environments/environment.ts`.

## Verificación

```sh
npm test -- --watch=false
npm run build
```

Las pruebas simulan Supabase. El pago es una simulación y los datos de tarjeta no se guardan.

## Publicación en Firebase Hosting

Con Firebase CLI instalada y un proyecto de Firebase creado:

```sh
firebase login
npm run build
firebase deploy --only hosting --project ID_DE_TU_PROYECTO
```

Reemplazar `ID_DE_TU_PROYECTO` por el identificador real. `firebase.json` publica `dist/cine-tp/browser` y permite abrir o recargar las rutas Angular. La configuración local está preparada; el proyecto todavía no se vinculó ni publicó en Firebase desde esta carpeta.

En Supabase, agregar la URL HTTPS publicada a **Authentication → URL Configuration**, en Site URL y Redirect URLs. Comprobar login, rutas directas, compras y cámara desde esa URL. La PWA se activa en el build de producción publicado en HTTPS.

## Base de datos

La aplicación se conecta al proyecto de Supabase indicado en `src/environments/environment.ts`. Las tablas y la función `gestionar-empleados` se mantienen en ese proyecto. La función verifica la sesión y el rol administrador; las claves administrativas permanecen en el servidor.

Esta copia del proyecto contiene el frontend y sus pruebas. Para instalar el backend en otro proyecto de Supabase se necesita exportar su esquema y obtener el código de las funciones publicadas.
