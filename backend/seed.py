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
from src.tarea.models import Tarea, FrecuenciaTarea
from src.plan.models import Plan

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
        insumos_creados = []
        for _ in range(15):
            insumo = Insumo(
                nombre=f"{fake.word().capitalize()} Sanitizante {fake.unique.random_int(min=100, max=999)}",
                cantidad=round(random.uniform(10.0, 500.0), 2),
                unidad_medida_id=random.choice(unidades).id,
            )
            db.add(insumo)
            insumos_creados.append(insumo)
        db.flush()

        # 4. Personal (15 registros con claves únicas)
        personal_creado = []
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
            personal_creado.append(persona)
        db.flush()

        # 5. Equipos (15 registros vinculados por Foreign Key al sector)
        equipos_creados = []
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
            equipos_creados.append(equipo)
        db.flush()

        # 6. Elementos de limpieza (15 registros)
        elementos_creados = []
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
            elementos_creados.append(elemento)
        db.flush()

        # 7. Tareas (30 registros para tener suficiente variedad)
        tareas_creadas = []
        tipos_frecuencia = list(FrecuenciaTarea)
        nombres_tareas = [
            "Limpieza profunda de pisos", "Desinfección de mesadas", "Vaciado y limpieza de tachos",
            "Lavado de utensilios menores", "Limpieza de ventanas y vidrios", "Desengrasado de campanas",
            "Sanitización de cámaras de frío", "Limpieza de rejillas y desagües", "Fregado de paredes",
            "Desinfección de picaportes y áreas de contacto", "Limpieza de filtros de aire", "Barrido en seco del sector",
            "Aplicación de espuma clorada", "Limpieza de básculas y balanzas", "Acondicionamiento de carros de transporte"
        ]
        
        # Duplicamos y variamos para tener más tareas generales y específicas de equipo
        for _ in range(30):
            nombre_tarea = random.choice(nombres_tareas)
            equipo_asignado = random.choice(equipos_creados) if random.random() > 0.5 else None
            elementos_tarea = random.sample(elementos_creados, random.randint(1, 3))
            insumos_tarea = random.sample(insumos_creados, random.randint(1, 3))
            
            tarea = Tarea(
                nombre=f"{nombre_tarea} - {'Específica' if equipo_asignado else 'General'}",
                frecuencia=random.choice(tipos_frecuencia),
                procedimiento=f"Procedimiento estandarizado para {nombre_tarea}. 1) Despejar el área. 2) Aplicar los insumos asignados respetando los tiempos de contacto. 3) Fregar con los elementos de limpieza. 4) Enjuagar y verificar que no queden residuos.",
                equipo_id=equipo_asignado.id if equipo_asignado else None
            )
            
            tarea.elementos.extend(elementos_tarea)
            tarea.insumos.extend(insumos_tarea)
            db.add(tarea)
            tareas_creadas.append(tarea)
        db.flush()

        # 8. Planes de Limpieza (15 registros)
        for i in range(15):
            es_activo = random.choice([True, False])
            fecha_inicio = hoy - timedelta(days=random.randint(30, 365))
            fecha_fin = fecha_inicio + timedelta(days=random.randint(10, 25)) if not es_activo else None
            
            asignar_a_equipo = random.choice([True, False])
            sector_id = None
            equipo_id = None
            tareas_posibles = []

            if asignar_a_equipo:
                equipo = random.choice(equipos_creados)
                equipo_id = equipo.id
                # El plan puede contener tareas de este equipo o tareas sin equipo asignado (generales)
                tareas_posibles = [t for t in tareas_creadas if t.equipo_id == equipo.id or t.equipo_id is None]
            else:
                sector = random.choice(sectores)
                sector_id = sector.id
                # Si es de un sector, asignamos tareas generales
                tareas_posibles = [t for t in tareas_creadas if t.equipo_id is None]

            # Seleccionamos entre 2 y 5 tareas para el plan, o las que haya disponibles
            cantidad_tareas = min(len(tareas_posibles), random.randint(2, 5))
            tareas_del_plan = random.sample(tareas_posibles, cantidad_tareas) if tareas_posibles else []

            plan = Plan(
                nombre=f"Plan Operativo {fake.word().capitalize()} {i+1}",
                descripcion="Plan de limpieza diseñado para mantener los estándares de higiene en este sector/equipo, cumpliendo la normativa vigente.",
                activo=es_activo,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                responsable_id=random.choice(personal_creado).dni,
                sector_id=sector_id,
                equipo_id=equipo_id
            )
            
            plan.tareas.extend(tareas_del_plan)
            db.add(plan)

        db.commit()
        print("✅ Base de datos poblada exitosamente con 15 registros por entidad y relaciones completas.")

    except Exception as e:
        db.rollback()
        print(f"❌ Ocurrió un error al cargar los datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cargar_datos()