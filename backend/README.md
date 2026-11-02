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

El seed no restablece contraseñas ni reinicia saldos. Los ingresos y consumos de demostración se aplican una sola vez. Crea ejemplos faltantes mediante claves estables; al repetirlo el mismo día no duplica datos. Completa el origen ficticio de consumos de ejemplos antiguos del propio seed, como se detalla debajo. Al cambiar de día puede agregar registros diarios de checklist e historial. En bases existentes conserva fechas, permisos y contraseñas anteriores.

| Usuario nuevo | Contraseña inicial | Caso |
| --- | --- | --- |
| `admin` | `admin123` | Administración y operación |
| `admin.solo` | `opera123` | Sólo administración |
| `opera` | `opera123` | Sólo operación; ve sus incidentes |
| `sin.permisos` | `opera123` | Sin capacidades; pantalla sin permisos |
| `inactivo.demo` | `opera123` | Usuario inactivo; login rechazado |

En una base nueva carga ejemplos de todas las entidades operativas, incidentes de todos los tipos, abiertos y cerrados, acciones correctivas e historial. Incluye documentos personales con distintas fechas de vencimiento, calibraciones, documentos técnicos con PDF de demostración, consumos, tareas realizadas y pendientes de hoy. Las fotografías necesarias están versionadas en `seed_assets/`; los archivos generados se guardan en `almacenamiento/evidencias/` y `almacenamiento/documentos_tecnicos/`.

### Trazabilidad obligatoria de ingredientes

Las nuevas producciones solo consumen recepciones activas, identificadas y sin
vencer, recibidas como máximo en su fecha de elaboración. La asignación es vence primero, se consume primero. El stock total puede ser mayor que el
utilizable: el saldo sin origen y los lotes vencidos no habilitan consumos.
Si falta saldo trazable se devuelve HTTP 409 sin movimientos parciales.

El endpoint histórico `POST /lotes-insumo/conciliar-stock` permite identificar
stock anterior con permiso de administración; no se ofrece en los listados. Debe
informar proveedor activo, número de lote, fechas y cantidad verificables.
Identificar no suma stock y no permite superar el saldo pendiente. Si no se
conocen los datos reales, el saldo permanece bloqueado; no usar datos demo para
regularizar existencias reales.

La antigua variable `PERMITIR_STOCK_SIN_LOTE` ya no tiene efecto. La tabla
`consumos_stock_anterior` se conserva por su valor histórico, sin nuevos
registros de consumo nuevos sin trazabilidad. No se reasigna origen a producciones reales pasadas.

El seed prepara recepciones con proveedor, lote y vencimiento antes de consumir
ingredientes, incluyendo el agua de amasado. En una base nueva no genera consumos sin
trazabilidad. En una base existente conserva los saldos y cantidades consumidas;
puede añadir los nuevos ingresos ficticios `DEMO-BASE-*` y `DEMO-AGUA-001` una
sola vez. No son una conciliación del stock anterior ni reemplazan su origen.
Ejecutarlo sobre datos de prueba, no para regularizar inventario real.

Para los ejemplos antiguos `L-SEED-001` a `L-SEED-015` y `L-ABAST-SEED-001`
a `L-ABAST-SEED-015`, el seed completa los orígenes que falten. Comprueba que
el código reservado, el producto y el autor correspondan a los ejemplos del seed.
Si esos datos no coinciden, detiene la carga sin sobrescribir el registro.
Los consumos ya registrados reciben recepciones **ficticias** `DEMO-HIST-*`,
con proveedor demo, fecha anterior a la elaboración, vencimiento posterior y
saldo disponible cero. Esto no vuelve a sumar ni descontar stock. Los antiguos
consumos sin trazabilidad de esos ejemplos se sustituyen por los vínculos demo;
no se modifica el historial de producciones reales.

Si un ejemplo antiguo no tenía ingredientes, registra su receta y aplica su
consumo trazado una sola vez. Al finalizar, valida las cantidades y los datos
de origen de cada ejemplo. Si falta trazabilidad o saldo, revierte toda la carga.
Repetir `python -m scripts.seed_all` completa los ejemplos existentes sin exigir
borrar la base; repetirlo después de completarlos no duplica los movimientos.

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
