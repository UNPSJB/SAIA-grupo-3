import random
from faker import Faker
from src.database import SessionLocal, engine
from src.models import ModeloBase
from src.personal.models import Personal, TipoCapacidad
from src.documentacion.models import Documentacion, TipoDocumento
from src.equipos.models import Equipo, TipoEquipo
from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
from src.insumos.models import Insumo

# Inicializamos Faker con localización en español
fake = Faker("es_AR")


def cargar_datos():
    # Asegura que las tablas estén creadas en la base de datos
    ModeloBase.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Crear Unidades de Medida base requeridas para los insumos
        unidades = [
            UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="Kg"),
            UnidadMedida(tipo=TipoUnidadMedida.CAPACIDAD, sufijo="Litros"),
            UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="Unidades"),
            UnidadMedida(tipo=TipoUnidadMedida.LONGITUD, sufijo="Metros"),
        ]
        db.add_all(unidades)
        db.flush()  # Asigna los IDs necesarios para las claves foráneas

        # 2. Generar Insumos vinculados a las unidades de medida
        nombres_insumos = [
            "Detergente Desengrasante",
            "Lavandina Concentrada",
            "Alcohol Etílico 70%",
            "Bolsas Sanitarias",
            "Cofias Descartables",
            "Jabón Antibacterial",
        ]
        for nombre in nombres_insumos:
            insumo = Insumo(
                nombre=f"{nombre} {fake.random_int(1, 50)}",
                cantidad=round(random.uniform(5.0, 150.0), 2),
                unidad_medida_id=random.choice(unidades).id,
            )
            db.add(insumo)

        # 3. Generar Equipos e Instrumentos
        sectores = ["Sector Envasado", "Línea 1 Cocción", "Cámara Frigorífica", "Laboratorio"]
        tipos_equipos = list(TipoEquipo)
        for _ in range(8):
            equipo = Equipo(
                nombre=f"{fake.word().capitalize()} Industrial {fake.random_int(100, 999)}",
                tipo=random.choice(tipos_equipos),
                ubicacion=random.choice(sectores),
            )
            db.add(equipo)

        # 4. Generar Personal con campos únicos (DNI, Legajo, Email)
        tipos_capacidad = list(TipoCapacidad)
        personal_creado = []
        for _ in range(6):
            persona = Personal(
                dni=fake.unique.random_int(min=20000000, max=45000000),
                nroLegajo=fake.unique.random_int(min=1000, max=9999),
                nombre=fake.first_name(),
                apellido=fake.last_name(),
                email=fake.unique.email(),
                tipo_capacidad=random.choice(tipos_capacidad),
            )
            db.add(persona)
            personal_creado.append(persona)

        db.flush()

        # 5. Generar Documentación vinculada al personal
        """
        tipos_documentacion = list(TipoDocumento)
        for persona in personal_creado:
            doc = Documentacion(
                nombre=f"Certificado {fake.word().capitalize()}",
                tipo_documento=random.choice(tipos_documentacion),
                personal_id=persona.dni,
            )
            db.add(doc)
        """
        db.commit()
        
        print("✅ Base de datos poblada exitosamente con datos de prueba.")

    except Exception as e:
        db.rollback()
        print(f"❌ Ocurrió un error al cargar los datos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    cargar_datos()