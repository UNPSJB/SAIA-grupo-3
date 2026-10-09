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


### Backend (FastAPI + SQLAlchemy + SQLite)
cd backend

# Entorno virtual
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Dependencias
pip install -r requirements.txt

# Variables de entorno
cp .env.template .env

# Datos de prueba (opcional)
python seed.py

# Levantar el servidor (http://localhost:8000, docs en /docs)
fastapi dev src/main.py

### Frontend (React + Vite + TypeScript)
cd frontend

npm ci

# Levantar en desarrollo (http://localhost:5173)
npm run dev

Para que el front funcione, el backend tiene que estar corriendo en http://localhost:8000 — esa URL es el valor por defecto y se puede cambiar con `VITE_API_BASE_URL` en `frontend/.env` (ver `.env.example`).


### Verificaciones

Frontend: `npm run build` y `npm run lint` desde `frontend`.
Consultar los README de cada carpeta para las convenciones de rutas, formularios y permisos.
