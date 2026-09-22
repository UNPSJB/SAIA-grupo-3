import random
from faker import Faker
from src.database import SessionLocal, engine
from src.models import ModeloBase
from src.sector.models import Sector
from src.personal.models import Personal, TipoCapacidad
from src.equipos.models import Equipo, TipoEquipo
from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
from src.insumos.models import Insumo

fake = Faker("es_AR")


def cargar_datos():
    # Creamos las tablas registradas en ModeloBase
    ModeloBase.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Unidades de Medida base requeridas para los insumos
        unidades = [
            UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="Kg"),
            UnidadMedida(tipo=TipoUnidadMedida.CAPACIDAD, sufijo="Litros"),
            UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="Unidades"),
            UnidadMedida(tipo=TipoUnidadMedida.LONGITUD, sufijo="Metros"),
        ]
        db.add_all(unidades)
        db.flush()

        # 2. Sectores (15 registros)
        sectores = []
        nombres_base_sectores = [
            "Envasado Primario", "Línea de Cocción A", "Cámara Frigorífica 1",
            "Laboratorio Central", "Depósito de Insumos", "Control de Calidad",
            "Mantenimiento General", "Área de Empaque", "Sector Molienda",
            "Zona de Despacho", "Silos de Harina", "Tratamiento de Agua",
            "Cámara de Maduración", "Planta Piloto", "Zona de Carga"
        ]
        for nombre in nombres_base_sectores:
            sector = Sector(
                nombre=nombre,
                activo=True
            )
            db.add(sector)
            sectores.append(sector)
        db.flush()

        # 3. Insumos (15 registros)
        for _ in range(15):
            insumo = Insumo(
                nombre=f"{fake.word().capitalize()} Sanitizante {fake.unique.random_int(min=100, max=999)}",
                cantidad=round(random.uniform(10.0, 500.0), 2),
                unidad_medida_id=random.choice(unidades).id,
            )
            db.add(insumo)

        # 4. Personal (15 registros con claves únicas)
        tipos_capacidad = list(TipoCapacidad)
        for _ in range(15):
            persona = Personal(
                dni=fake.unique.random_int(min=20000000, max=45000000),
                nroLegajo=fake.unique.random_int(min=1000, max=9999),
                nombre=fake.first_name(),
                apellido=fake.last_name(),
                email=fake.unique.email(),
                tipo_capacidad=random.choice(tipos_capacidad),
            )
            db.add(persona)

        # 5. Equipos (15 registros vinculados por Foreign Key al sector)
        tipos_equipos = list(TipoEquipo)
        nombres_equipos = [
            "Balanza de Precisión", "Mezcladora", "Horno Convector",
            "Envasadora al Vacío", "Termómetro Infrarrojo", "Autoclave",
            "Cinta Transportadora", "Calibrador Digital", "Detector de Metales",
            "Bomba Centrífuga", "Molino Industrial", "Tamiz Vibratorio",
            "Selladora Térmica", "Compresor de Aire", "Tanque Homogeneizador"
        ]
        for i in range(15):
            equipo = Equipo(
                nombre=nombres_equipos[i],
                tipo=random.choice(tipos_equipos),
                numero_serie=f"SN-{fake.unique.bothify(text='??-####').upper()}",
                activo=True,
                sector_id=random.choice(sectores).id,
            )
            db.add(equipo)

        db.commit()
        print("✅ Base de datos poblada exitosamente con 15 registros por entidad y relaciones operativas.")

    except Exception as e:
        db.rollback()
        print(f"❌ Ocurrió un error al cargar los datos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    cargar_datos()