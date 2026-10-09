#### Descripción

Este proyecto contiene un ejemplo de la estructura recomendada para nuevos proyectos que utilicen FastAPI en el backend. 

Se sugiere mantener la estructura de archivos (basada en [fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)), adaptándola al dominio que corresponda. Esto es, creando nuevos módulos que contengan mínimamente los siguientes elementos:

*  `constants.py`
*  `exceptions.py`
*  `models.py`
*  `router.py`
*  `schemas.py`
*  `services.py`

Si se lo desea, añadir tests para dichos módulos debiera seguir la misma estructura que los disponibles en la carpeta `tests`, con las adaptaciones que se consideren necesarias.

#### ¿Cómo lo ejecuto?

1. Instalar dependencias dentro de un entorno virtual con: `pip install -r requirements.txt`
2. Crea una copia del archivo `.env.template` con el nombre `.env` y reemplaza los valores de las variables de entorno que creas necesarias.
3. Asumiendo que estamos en la raiz del repositorio y nuestro código dentro de `src/`, iniciar el proyecto ejecutando: `fastapi dev src/main.py`
4. Cuando el proyecto esté listo, abrir http://localhost:8000/docs para probar la API de manera interactiva.

Opcionalmente:
1. Asumiendo que estamos en la raíz del repositorio, ejecutar los tests con: `python -m pytest tests/`

**Importante**: 
* Al trabajar en nuevos dominios, los módulos y archivos de ejemplo (Personals, mascotas) ya no son necesarios y pueden ser eliminados junto con cualquier referencia a ellos dentro de `src/` y `tests/`.
* Por defecto el proyecto utiliza el motor de base de datos `sqlite` por lo que los datos de la app vivirán dentro del archivo cuyo nombre está definido en el archivo `.env` (por ejemplo: `db.sqlite3`) a menos que se renombre y/o se decida utilizar otro motor de base de datos.
* Los tests han sido configurados para ejecutarse utilizando una base de datos en memoria por lo que no existe un archivo que contenga sus datos. Estos tests están relacionados al dominio Personals/mascotas por lo que si borras los módulos, es probable que dejen de funcionar.

## Instalación reproducible y pruebas

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.template .env
fastapi dev src/main.py
```

Para desarrollo y pruebas:

```sh
pip install -r requirements-dev.txt
python -m pytest -q
```

Las pruebas usan SQLite en memoria y desactivan el scheduler; no modifican la base de desarrollo.
`requirements.txt` mantiene las dependencias de producción; `requirements-dev.txt` incluye esas dependencias y pytest con versión fija. No se agregaron bibliotecas de producción para búsqueda, ordenamiento o permisos: se utiliza FastAPI y SQLAlchemy existentes.

Los listados conservan `items`, `total`, `page`, `size` y `pages`. Admiten `buscar`, `ordenar_por` y `orden` (`asc`/`desc`) según las columnas de cada módulo. La búsqueda se aplica antes de paginar y el ID desempata órdenes equivalentes. Columnas o direcciones inválidas devuelven 422.

`PermissionedRouter` exige administración por defecto para lecturas y escrituras. Las excepciones explícitas permiten consultar el propio perfil y operar checklist/incidentes. Un usuario sin capacidades puede consultar su perfil, pero no los módulos operativos o administrativos.

La configuración CORS debe permitir el origen del frontend en el ambiente donde se despliegue. Para desarrollo se conserva `http://localhost:5173`.

### Datos para probar el frontend

Con la configuración de `.env` del backend lista, ejecutar desde `backend/`:

```bash
.venv/bin/python seed.py
```

El seed no borra la base; crea o actualiza sus registros de demostración y restablece sus contraseñas, stock, estados y avisos. Puede repetirse sin duplicar los registros del mismo día. Las fechas se calculan al ejecutarlo; al cambiar de día se agrega historial.

| Usuario | Contraseña | Caso |
| --- | --- | --- |
| `admin` | `admin123` | Administración y operación; checklist con pendientes y realizadas |
| `admin.solo` | `opera123` | Sólo administración |
| `opera` | `opera123` | Sólo operación; checklist con pendientes y realizadas |
| `sin.permisos` | `opera123` | Sin capacidades; pantalla sin permisos |
| `inactivo.demo` | `opera123` | Usuario dado de baja; login rechazado |
| `operario.demo01` | `opera123` | Operación con checklist vacío |

Los catálogos tienen al menos 30 registros activos para probar varias páginas y tres inactivos para reactivar. En Sectores, buscar `Sector 30` permite comprobar resultados fuera de la primera página; buscar `sin-resultados` permite probar el estado vacío. `Sector libre para baja` no tiene equipos asociados; los sectores numerados tienen equipos para comprobar la restricción de baja.

Hay documentos vencidos, que vencen hoy, próximos a vencer y vigentes; elementos vencidos y próximos a recambio; planes finalizados; consumos activos e inactivos e incidentes e historial con varias páginas. `opera` tiene además tareas diarias, semanales y mensuales, tareas sin químicos, con dos químicos y con stock insuficiente. La campana incluye avisos históricos leídos y el aviso de hoy no leído, respetando la consolidación de vencimientos de la aplicación.

Las pruebas de errores de red, sesión vencida, archivos adjuntos y datos inválidos requieren provocar esas condiciones desde el navegador o la API; el seed carga datos válidos para iniciar esos escenarios.
