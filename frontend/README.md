# Frontend SAIA

React + TypeScript + Vite, React Router, React Hook Form y Bootstrap.

## Instalación y ejecución

Usar Node.js 22.12 o posterior compatible con Vite 8.

```sh
npm ci
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` configura el backend; por defecto es `http://localhost:8000`.
Las variables Vite son públicas. Reiniciar el servidor de desarrollo al cambiarlas.

## Verificación

```sh
npm run build
npm run lint
npm test
```

`npm run format` aplica Prettier al código de `src`.
Las dependencias de producción y desarrollo se declaran en `package.json` y se resuelven en `package-lock.json`.
Para agregar una dependencia, usar `npm install paquete` o `npm install -D paquete`; guardar ambos archivos.

## Convenciones

- Organización por funcionalidades en `src/features`; componentes y hooks reutilizables en `src/shared`.
- React Router mantiene listado, alta (`/nuevo`), detalle (`/:id`) y edición (`/:id/editar`). La confirmación de baja usa `/:id/eliminar` en catálogos.
- Búsqueda, orden, página y filtros se conservan en parámetros de URL. Los listados paginados filtran y ordenan en el backend; esperan 300 ms al escribir y descartan respuestas obsoletas.
- Checklist filtra el conjunto completo del día en el frontend, conservando los totales de avance. Los selectores extensos permiten búsqueda y cargan todas las páginas de opciones.
- React Hook Form administra validación y estados de envío; Bootstrap mantiene el diseño.
- `AuthProvider` carga el perfil al iniciar sesión/restaurarla. `permissions` y `ProtectedRoute` usan las capacidades del contexto, sin consultar el perfil por formulario.
- Administración conserva los módulos administrativos y operación conserva checklist e incidentes. Editar/borrar incidentes requiere además administración. El backend vuelve a verificar cada permiso.
- No se usan loaders/actions ni `Form` de React Router. La capa API existente conserva el acceso autenticado.

En hosting, configurar fallback de las rutas del frontend hacia `index.html` para permitir recargar URLs de detalle.
