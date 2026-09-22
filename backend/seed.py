import random
from datetime import date, timedelta
from faker import Faker
from src.database import SessionLocal, engine
from src.models import ModeloBase
from src.sector.models import Sector
from src.personal.models import Personal, TipoCapacidad
from src.equipos.models import Equipo, TipoEquipo
from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
from src.insumos.models import Insumo
from src.elementos.models import Elemento
from src.tarea.models import Tarea

fake = Faker("es_AR")

def cargar_datos():
    # Creamos las tablas registradas en ModeloBase
    ModeloBase.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Unidades de Medida base requeridas para los insumos (15 registros)
        unidades = []
        nombres_unidades = [
            (TipoUnidadMedida.PESO, "Kg"), (TipoUnidadMedida.PESO, "Gramos"), (TipoUnidadMedida.PESO, "Libras"),
            (TipoUnidadMedida.CAPACIDAD, "Litros"), (TipoUnidadMedida.CAPACIDAD, "Mililitros"), (TipoUnidadMedida.CAPACIDAD, "Galones"),
            (TipoUnidadMedida.UNIDAD, "Unidades"), (TipoUnidadMedida.UNIDAD, "Pares"), (TipoUnidadMedida.UNIDAD, "Cajas"),
            (TipoUnidadMedida.UNIDAD, "Paquetes"), (TipoUnidadMedida.UNIDAD, "Botellas"), (TipoUnidadMedida.UNIDAD, "Bidones"),
            (TipoUnidadMedida.LONGITUD, "Metros"), (TipoUnidadMedida.LONGITUD, "Centímetros"), (TipoUnidadMedida.LONGITUD, "Milímetros")
        ]
        
        for tipo, sufijo in nombres_unidades:
            unidad = UnidadMedida(tipo=tipo, sufijo=sufijo)
            db.add(unidad)
            unidades.append(unidad)
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
            sector = Sector(nombre=nombre, activo=True)
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

        # 6. Elementos de limpieza (15 registros)
        # Algunos tendrán recambios al día, otros estarán vencidos y otros próximos a vencer para probar el semáforo.
        nombres_elementos = [
            "Cepillo de cerdas suaves", "Cepillo de cerdas duras",
            "Escobillón industrial", "Pala recogedora", "Trapo de microfibra",
            "Paño absorbente", "Esponja abrasiva", "Esponja suave",
            "Mopa de algodón", "Mopa de microfibra", "Secador de piso",
            "Balde plástico", "Guantes reutilizables", "Cepillo para rincones",
            "Raspador plástico"
        ]
        
        hoy = date.today()
        
        for i, nombre in enumerate(nombres_elementos):
            frecuencia = random.choice([7, 15, 30, 60, 90])
            
            # Generamos distintos escenarios para probar los colores del frontend
            if i % 3 == 0:
                # Escenario: Vencido (rojo)
                ultimo = hoy - timedelta(days=frecuencia + random.randint(1, 10))
            elif i % 3 == 1:
                # Escenario: Próximo a vencer (amarillo, entre 0 y 5 días)
                ultimo = hoy - timedelta(days=frecuencia - random.randint(0, 4))
            else:
                # Escenario: Vigente (verde, más de 5 días)
                ultimo = hoy - timedelta(days=random.randint(1, max(1, frecuencia - 6)))
                
            proximo = ultimo + timedelta(days=frecuencia)
            
            elemento = Elemento(
                nombre=nombre,
                frecuencia_recambio=frecuencia,
                fecha_ultimo_recambio=ultimo,
                fecha_proximo_recambio=proximo,
                activo=True,
            )
            db.add(elemento)

        # 7. Tareas (15 registros)
        nombres_tareas = [
            "Limpieza profunda de pisos", "Desinfección de mesadas", "Vaciado y limpieza de tachos",
            "Lavado de utensilios menores", "Limpieza de ventanas y vidrios", "Desengrasado de campanas",
            "Sanitización de cámaras de frío", "Limpieza de rejillas y desagües", "Fregado de paredes",
            "Desinfección de picaportes y áreas de contacto", "Limpieza de filtros de aire", "Barrido en seco del sector",
            "Aplicación de espuma clorada", "Limpieza de básculas y balanzas", "Acondicionamiento de carros de transporte"
        ]
        for desc in nombres_tareas:
            tarea = Tarea(descripcion=desc)
            db.add(tarea)

        db.commit()
        print("✅ Base de datos poblada exitosamente con 15 registros por entidad y fechas para probar alertas.")

    except Exception as e:
        db.rollback()
        print(f"❌ Ocurrió un error al cargar los datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cargar_datos()