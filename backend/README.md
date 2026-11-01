# Backend SAIA

FastAPI + SQLAlchemy + SQLite. Requiere Python 3.11 o superior; la instalación limpia fue verificada con Python 3.13.

## Instalación reproducible

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.template .env
fastapi dev src/main.py
```

En Windows (PowerShell), crear el entorno con `py -3 -m venv .venv`, activarlo con `.\.venv\Scripts\Activate.ps1` y copiar la configuración con `Copy-Item .env.template .env`. Los comandos de pip y FastAPI son los mismos. Si no se activa el entorno, usar directamente sus ejecutables en `.venv\Scripts`.

No sobrescribir un `.env` existente. `DB_URL` define la base; `DB_URL_TEST` es la configuración para pruebas. Ejecutar siempre desde `backend/` para que las rutas relativas y `.env` se resuelvan correctamente. Reiniciar el servidor después de cambiar la configuración o de rama.

`requirements.txt` mantiene las dependencias del backend y de las pruebas, incluyendo pytest, TestClient, JWT, Argon2, formularios/archivos y scheduler. Se instalan juntas con el comando anterior. No se exige `uvloop` directamente: algunas dependencias pueden instalarlo automáticamente en plataformas compatibles; Windows usa el bucle estándar de asyncio.

Comprobar la instalación con `python -m pip check`. Backend en http://localhost:8000 y documentación en http://localhost:8000/docs.

Los listados conservan `items`, `total`, `page`, `size` y `pages`. Admiten `buscar`, `ordenar_por` y `orden` (`asc`/`desc`) según las columnas de cada módulo. La búsqueda se aplica antes de paginar y el ID desempata órdenes equivalentes. Columnas o direcciones inválidas devuelven 422.

`PermissionedRouter` exige administración por defecto para lecturas y escrituras. Las excepciones explícitas permiten consultar el propio perfil y operar checklist/incidentes. Un usuario sin capacidades puede consultar su perfil, pero no los módulos operativos o administrativos.

La configuración CORS debe permitir el origen del frontend en el ambiente donde se despliegue. Para desarrollo se conserva `http://localhost:5173`.

### Datos para probar el frontend

Con la configuración de `.env` del backend lista, ejecutar desde `backend/`:

```bash
.venv/bin/python -m scripts.seed_all
```

Los scripts están en `scripts/`. `seed_all.py` coordina la carga en orden de
dependencias y confirma la transacción al finalizar; si falla un módulo, revierte
los cambios de la base de esa ejecución. Cada `seed_<modulo>.py` contiene los datos
y la función de carga de su módulo. `seed_common.py` reúne las utilidades
compartidas. Importar estos módulos no ejecuta la carga; sus funciones reciben la
sesión o la función de creación y los registros que necesitan.

Las fotografías originales permanecen en `seed_assets/`. Los archivos generados
no forman parte de la transacción de base de datos: si falla la carga, pueden
quedar archivos demo que se reutilizan al reintentar.

La migración histórica de superadmin se ejecuta por separado, desde `backend/`:

```bash
.venv/bin/python -m scripts.migrate_superadmin
```

`seed_all` no ejecuta migraciones automáticamente.

El seed no borra ni actualiza registros existentes, no restablece contraseñas ni reinicia saldos. Los ingresos y consumos de demostración se aplican una sola vez. Crea ejemplos faltantes mediante claves estables; al repetirlo el mismo día no duplica datos. Al cambiar de día puede agregar registros diarios de checklist e historial. En bases existentes puede conservar fechas, permisos y contraseñas anteriores.

| Usuario nuevo | Contraseña inicial | Caso |
| --- | --- | --- |
| `admin` | `admin123` | Administración y operación |
| `admin.solo` | `opera123` | Sólo administración |
| `opera` | `opera123` | Sólo operación; ve sus incidentes |
| `sin.permisos` | `opera123` | Sin capacidades; pantalla sin permisos |
| `inactivo.demo` | `opera123` | Usuario inactivo; login rechazado |

En una base nueva carga al menos 15 registros por entidad, incidentes de todos los tipos, abiertos y cerrados, acciones correctivas e historial. Incluye documentos personales con distintas fechas de vencimiento, calibraciones, documentos técnicos con PDF de demostración, consumos, tareas realizadas y pendientes de hoy. Las fotografías necesarias están versionadas en `seed_assets/`; los archivos generados se guardan en `almacenamiento/evidencias/` y `almacenamiento/documentos_tecnicos/`.

`create_all` crea tablas nuevas, pero no migra tablas existentes. Si una base de otra rama tiene columnas faltantes, conservarla y coordinar la actualización del esquema; reinstalar dependencias o repetir el seed no migra esa base.

### Almacenamiento de archivos

`src/config.py` centraliza las ubicaciones físicas: `UPLOADS_DIR` apunta a
`almacenamiento/evidencias/` y `ARCHIVOS_DIR` a
`almacenamiento/documentos_tecnicos/`. Las carpetas se crean al guardar archivos.
Los identificadores `/uploads/...` guardados en la base y los endpoints de
descarga se conservan; no deben reemplazarse por rutas de disco.

En otras copias del proyecto con archivos existentes, detener el backend y mover
el contenido de `uploads/` a `almacenamiento/evidencias/`, y el de
`archivos/documentos-tecnicos/` a `almacenamiento/documentos_tecnicos/`, antes de
reiniciarlo. Si ya existe algún archivo en destino, comprobar su contenido antes
de moverlo para evitar sobrescribirlo.
