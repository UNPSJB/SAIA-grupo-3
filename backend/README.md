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

`requirements.txt` mantiene las dependencias del backend, incluyendo JWT, Argon2, formularios/archivos y scheduler. No se exige `uvloop` directamente: algunas dependencias pueden instalarlo automáticamente en plataformas compatibles; Windows usa el bucle estándar de asyncio.

Comprobar la instalación con `python -m pip check`. Backend en http://localhost:8000 y documentación en http://localhost:8000/docs.

Los listados conservan `items`, `total`, `page`, `size` y `pages`. Admiten `buscar`, `ordenar_por` y `orden` (`asc`/`desc`) según las columnas de cada módulo. La búsqueda se aplica antes de paginar y el ID desempata órdenes equivalentes. Columnas o direcciones inválidas devuelven 422.

`PermissionedRouter` exige administración por defecto para lecturas y escrituras. Las excepciones explícitas permiten consultar el propio perfil y operar checklist/incidentes. Un usuario sin capacidades puede consultar su perfil, pero no los módulos operativos o administrativos.

La configuración CORS debe permitir el origen del frontend en el ambiente donde se despliegue. Para desarrollo se conserva `http://localhost:5173`.

### Datos para probar el frontend

Con la configuración de `.env` del backend lista, ejecutar desde `backend/`:

```bash
.venv/bin/python seed.py
```

El seed no borra ni actualiza registros existentes, no restablece contraseñas y no descuenta stock. Crea ejemplos faltantes mediante claves estables; al repetirlo el mismo día no duplica datos. Al cambiar de día puede agregar registros diarios de checklist e historial. En bases existentes puede conservar fechas, permisos y contraseñas anteriores.

| Usuario nuevo | Contraseña inicial | Caso |
| --- | --- | --- |
| `admin` | `admin123` | Administración y operación |
| `admin.solo` | `opera123` | Sólo administración |
| `opera` | `opera123` | Sólo operación; ve sus incidentes |
| `sin.permisos` | `opera123` | Sin capacidades; pantalla sin permisos |
| `inactivo.demo` | `opera123` | Usuario inactivo; login rechazado |

En una base nueva carga al menos 15 registros por entidad, incidentes de todos los tipos, abiertos y cerrados, acciones correctivas e historial. Incluye documentos personales con distintas fechas de vencimiento, calibraciones, documentos técnicos con PDF de demostración, consumos, tareas realizadas y pendientes de hoy. Las fotografías necesarias están versionadas en `seed_assets/`; los archivos generados se guardan en `uploads/` y `archivos/`.

`create_all` crea tablas nuevas, pero no migra tablas existentes. Si una base de otra rama tiene columnas faltantes, conservarla y coordinar la actualización del esquema; reinstalar dependencias o repetir el seed no migra esa base.
