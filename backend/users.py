from src.database import SessionLocal, engine
from src.personal.models import Personal
from src.auth.utils import get_password_hash
from src.models import ModeloBase

# ============================================================
# CARGAR MODELOS (Para evitar errores de importación cruzada)
# ============================================================
from src.sector.models import Sector
from src.equipos.models import Equipo
from src.documentacion.models import Documentacion
from src.elementos.models import Elemento
from src.insumos.models import Insumo
from src.unidadMedida.models import UnidadMedida
from src.insumosQuimicos.models import InsumoQuimico
from src.tarea.models import Tarea
from src.tareaRealizada.models import TareaRealizada
from src.plan.models import Plan
from src.planRealizado.models import PlanRealizado

# ============================================================
# CREAR ADMIN Y OPERARIO
# ============================================================

# Generamos las tablas en la base de datos si es que no existen
ModeloBase.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # --- 1. Crear el Administrador ---
    # Buscamos si ya existe para no duplicarlo y causar errores
    admin = db.query(Personal).filter_by(username="admin").first()
    
    if not admin:
        admin = Personal(
            nombre="Administrador",
            apellido="SAIA",
            dni="99999999",
            nroLegajo="ADMIN01",     # ¡Faltaba este campo obligatorio!
            email="admin@saia.com",  # Es email, NO mail
            username="admin",
            hashed_password=get_password_hash("admin123"),
            operar=True,
            administrar=True,
            activo=True,
        )
        db.add(admin)

    # --- 2. Crear el Operario ---
    nuevo_operario = db.query(Personal).filter_by(username="opera").first()
    
    if not nuevo_operario:
        nuevo_operario = Personal(
            nombre="Operador",
            apellido="SAIA",
            dni="40123456",
            nroLegajo="OPE002",             # ¡Faltaba este campo obligatorio!
            email="maria.gomez@ejemplo.com", # Es email, NO mail
            username="opera",
            hashed_password=get_password_hash("opera123"),
            operar=True,          
            administrar=False,    
            activo=True
        )
        db.add(nuevo_operario)

    # Se guardan los cambios en la DB
    db.commit()
    db.refresh(admin)
    db.refresh(nuevo_operario)

    print("=================================")
    print("✅ USUARIOS LISTOS EN EL SISTEMA")
    print("=================================")
    print(f"🔹 ADMIN -> ID: {admin.id} | Usuario: {admin.username} | Pass: admin123")
    print(f"🔸 OPERARIO -> ID: {nuevo_operario.id} | Usuario: {nuevo_operario.username} | Pass: opera123")
    print("=================================")

except Exception as e:
    db.rollback()
    print(f"❌ Error al crear los usuarios: {e}")
    
finally:
    db.close()