# Sistema de apoyo para la inocuidad alimentaria

### Descripción
El proyecto se enmarca en el desarrollo de un sistema de apoyo a la inocuidad alimentaria, con el objetivo de permitir la visualización de indicadores de gestión de la misma, a partir de la administración de diferentes instrumentos de relevamiento de Buenas Prácticas de Manufactura (BPM) y Procedimientos Operativos Estandarizados (POES), como protocolos, muestreos, puntos de control, entre otros.

### Integrantes:
* Mauricio Belforte
* Daiana Aixa Gil
* Celeste Abril Huschitt Herlein
* Axel Osorio
* Alejandro Salamin
* Agustin Vargas


### Requisitos

- Python 3.11 o superior (`StrEnum` se utiliza en el backend). Instalación verificada con Python 3.13.
- Node.js 22.12 o superior y npm. Se recomienda Node 22 o 24 LTS.
- Git. SQLite está incluido con Python; no requiere instalar un servidor de base de datos.

### Backend (FastAPI + SQLAlchemy + SQLite)

Desde la raíz del repositorio, en Linux/macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.template .env
# Opcional, después de configurar .env:
python seed.py
fastapi dev src/main.py
```

En Windows (PowerShell):

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.template .env
# Opcional, después de configurar .env:
python seed.py
fastapi dev src/main.py
```

Si no se puede activar el entorno en PowerShell, usar directamente `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` y `.\.venv\Scripts\fastapi.exe dev src/main.py`.

Configurar `DB_URL` en `.env`; el valor de ejemplo guarda la base en `backend/db.sqlite3`. No sobrescribir un `.env` existente. El seed conserva datos y contraseñas existentes; detalles y usuarios en [backend/README.md](backend/README.md).

Backend: http://localhost:8000. Documentación de la API: http://localhost:8000/docs.

### Frontend (React + Vite + TypeScript)

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
npm ci
# Linux/macOS, opcional para cambiar la URL del backend:
cp .env.example .env
npm run dev
```

En Windows, reemplazar la copia por `Copy-Item .env.example .env` (PowerShell). El resto de los comandos es igual.

Frontend: http://localhost:5173. Mantener ambas terminales abiertas. Si Vite elige otro puerto porque 5173 está ocupado, liberar ese puerto antes de iniciar: el backend permite ese origen mediante CORS.

`VITE_API_BASE_URL` configura la URL del backend y por defecto vale `http://localhost:8000`. Reiniciar Vite si cambia `.env`; sus variables son públicas y no deben contener secretos.

Las dependencias Python están en `backend/requirements.txt`; las del frontend, en `frontend/package.json` y `frontend/package-lock.json`. No hace falta un `requirements.txt` para el frontend. Al traer cambios de compañeros, repetir `python -m pip install -r requirements.txt` y `npm ci` en sus carpetas respectivas.

### Verificaciones

Backend: `python -m pip check` desde el entorno virtual.
Frontend: `npm run build` y `npm run lint` desde `frontend`.
Consultar los README de cada carpeta para las convenciones de rutas, formularios y permisos.
