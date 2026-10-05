"""Carga datos de demostración de forma repetible y sin borrar datos.

Ejecutar desde backend/:  .venv/bin/python seed.py
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from faker import Faker
from sqlalchemy import func, select

# Importar la app registra todos los modelos en la metadata SQLAlchemy.
from src.main import app  # noqa: F401
from src.database import SessionLocal, engine
from src.models import ModeloBase
from src.auth.utils import get_password_hash
from src.personal.models import Personal
from src.unidadMedida.models import UnidadMedida, TipoUnidadMedida
from src.sector.models import Sector
from src.equipos.models import Equipo, TipoEquipo
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.elementos.models import Elemento
from src.tarea.models import Tarea, TareaInsumoQuimico, FrecuenciaTarea
from src.plan.models import Plan
from src.documentacion.models import Documentacion, TipoDocumento
from src.checklist.models import ItemChecklist, EstadoItem, MovimientoItemChecklist, AccionMovimiento
from src.planRealizado.models import PlanRealizado
from src.tareaRealizada.models import TareaRealizada
from src.consumoQuimico.models import ConsumoQuimico

fake = Faker("es_AR")
Faker.seed(20261005)

CANTIDAD = 15
PASSWORD_ADMIN = "admin123"
PASSWORD_OPERARIO = "opera123"


def obtener_o_crear(db, modelo, filtros: dict, valores: dict):
    registro = db.scalar(select(modelo).filter_by(**filtros))
    creado = registro is None
    if creado:
        registro = modelo(**filtros, **valores)
        db.add(registro)
        db.flush()
    else:
        for clave, valor in valores.items():
            setattr(registro, clave, valor)
    return registro, creado


def crear_personal(db):
    """Garantiza los usuarios de users.py y completa 15 personas de prueba."""
    hashes = {
        "admin": get_password_hash(PASSWORD_ADMIN),
        "operario": get_password_hash(PASSWORD_OPERARIO),
    }
    especificaciones = [
        {
            "username": "admin",
            "nombre": "Administrador",
            "apellido": "SAIA",
            "dni": "99999999",
            "nroLegajo": "ADMIN01",
            "email": "admin@saia.com",
            "operar": True,
            "administrar": True,
            "hashed_password": hashes["admin"],
            "activo": True,
        },
        {
            "username": "opera",
            "nombre": "Operador",
            "apellido": "SAIA",
            "dni": "40123456",
            "nroLegajo": "OPE002",
            "email": "maria.gomez@ejemplo.com",
            "operar": True,
            "administrar": False,
            "hashed_password": hashes["operario"],
            "activo": True,
        },
    ]
    for numero in range(3, CANTIDAD + 1):
        username = f"operario.demo{numero - 2:02d}"
        especificaciones.append({
            "username": username,
            "nombre": fake.first_name(),
            "apellido": fake.last_name(),
            "dni": f"990000{numero - 1:04d}",
            "nroLegajo": f"DEMO-{numero - 1:04d}",
            "email": f"{username}@example.com",
            "operar": True,
            "administrar": False,
            "hashed_password": hashes["operario"],
            "activo": True,
        })

    usuarios = []
    for valores in especificaciones:
        username = valores.pop("username")
        persona, _ = obtener_o_crear(db, Personal, {"username": username}, valores)
        usuarios.append(persona)
    return usuarios


def quitar_etiquetas_anteriores(db) -> None:
    """Limpia los nombres del seed anterior sin borrar registros ni relaciones."""
    prefijo = "[DEMO SAIA] "
    campos = [
        (Sector, "nombre"), (Equipo, "nombre"), (Insumo, "nombre"),
        (InsumoQuimico, "nombre"), (Elemento, "nombre"), (Tarea, "nombre"),
        (Plan, "nombre"), (Documentacion, "nombre"),
        (PlanRealizado, "nombre"), (TareaRealizada, "nombre"),
        (ConsumoQuimico, "tarea_limpieza"),
    ]
    for modelo, campo in campos:
        for registro in db.scalars(select(modelo)).all():
            valor = getattr(registro, campo, None)
            if isinstance(valor, str) and valor.startswith(prefijo):
                setattr(registro, campo, valor[len(prefijo):])
    for tarea in db.scalars(select(Tarea)).all():
        if tarea.procedimiento:
            tarea.procedimiento = tarea.procedimiento.replace(prefijo, "")
    db.flush()


def cargar_seed() -> None:
    ModeloBase.metadata.create_all(bind=engine)
    hoy = date.today()
    ayer = hoy - timedelta(days=1)

    with SessionLocal() as db:
        try:
            quitar_etiquetas_anteriores(db)
            personas = crear_personal(db)

            definiciones_unidad = [
                (TipoUnidadMedida.UNIDAD, "un"),
                (TipoUnidadMedida.UNIDAD, "par"),
                (TipoUnidadMedida.UNIDAD, "caja"),
                (TipoUnidadMedida.UNIDAD, "paquete"),
                (TipoUnidadMedida.UNIDAD, "rollo"),
                (TipoUnidadMedida.PESO, "mg"),
                (TipoUnidadMedida.PESO, "g"),
                (TipoUnidadMedida.PESO, "kg"),
                (TipoUnidadMedida.PESO, "lb"),
                (TipoUnidadMedida.CAPACIDAD, "ml"),
                (TipoUnidadMedida.CAPACIDAD, "L"),
                (TipoUnidadMedida.CAPACIDAD, "cc"),
                (TipoUnidadMedida.CAPACIDAD, "gal"),
                (TipoUnidadMedida.LONGITUD, "cm"),
                (TipoUnidadMedida.LONGITUD, "m"),
            ]
            unidades = []
            for tipo, sufijo in definiciones_unidad:
                unidad, _ = obtener_o_crear(
                    db, UnidadMedida, {"sufijo": sufijo},
                    {"tipo": tipo, "activo": True},
                )
                unidades.append(unidad)

            sectores = []
            for numero in range(1, CANTIDAD + 1):
                sector, _ = obtener_o_crear(
                    db, Sector,
                    {"nombre": f"Sector {numero:02d}"},
                    {"activo": True},
                )
                sectores.append(sector)

            equipos = []
            tipos_equipo = list(TipoEquipo)
            for numero in range(1, CANTIDAD + 1):
                equipo, _ = obtener_o_crear(
                    db, Equipo,
                    {"numero_serie": f"DEMO-EQ-{numero:04d}"},
                    {
                        "nombre": f"{fake.word().capitalize()} {numero:02d}",
                        "tipo": tipos_equipo[(numero - 1) % len(tipos_equipo)],
                        "activo": True,
                        "sector_id": sectores[numero - 1].id,
                    },
                )
                equipos.append(equipo)

            insumos = []
            for numero in range(1, CANTIDAD + 1):
                unidad = unidades[(numero - 1) % len(unidades)]
                insumo, _ = obtener_o_crear(
                    db, Insumo,
                    {"nombre": f"Insumo general {numero:02d}"},
                    {
                        "cantidad": float(100 + numero * 7),
                        "unidad_medida_id": unidad.id,
                        "activo": True,
                    },
                )
                insumos.append(insumo)

            quimicos = []
            tipos_quimicos = list(TipoQuimico)
            unidades_capacidad = [
                unidad for unidad in unidades
                if unidad.tipo == TipoUnidadMedida.CAPACIDAD
            ]
            for numero in range(1, CANTIDAD + 1):
                unidad = unidades_capacidad[(numero - 1) % len(unidades_capacidad)]
                quimico, _ = obtener_o_crear(
                    db, InsumoQuimico,
                    {"nombre": f"Químico {numero:02d}"},
                    {
                        "cantidad": float(100 + numero * 10),
                        "tipo_quimico": tipos_quimicos[(numero - 1) % len(tipos_quimicos)],
                        "activo": True,
                        "unidad_medida_id": unidad.id,
                    },
                )
                quimicos.append(quimico)

            elementos = []
            for numero in range(1, CANTIDAD + 1):
                elemento, _ = obtener_o_crear(
                    db, Elemento,
                    {"nombre": f"Elemento de limpieza {numero:02d}"},
                    {
                        "frecuencia_recambio": 30 + (numero % 6) * 15,
                        "fecha_ultimo_recambio": ayer,
                        "fecha_proximo_recambio": hoy + timedelta(days=30 + numero),
                        "activo": True,
                    },
                )
                elementos.append(elemento)

            tareas = []
            for numero in range(1, CANTIDAD + 1):
                nombre_tarea = f"Tarea diaria {numero:02d}"
                tarea, _ = obtener_o_crear(
                    db, Tarea, {"nombre": nombre_tarea},
                    {
                        "frecuencia": FrecuenciaTarea.DIARIA,
                        "procedimiento": (
                            "Limpiar y desinfectar la zona asignada. "
                            f"Revisar el elemento de limpieza {numero:02d} y registrar "
                            "el consumo real del químico usado."
                        ),
                        "equipo_id": equipos[numero - 1].id,
                    },
                )
                tarea.frecuencia = FrecuenciaTarea.DIARIA
                tarea.equipo_id = equipos[numero - 1].id
                tarea.elementos = [elementos[numero - 1]]

                requisito = next(
                    (r for r in tarea.insumos_quimicos
                     if r.insumo_quimico_id == quimicos[numero - 1].id),
                    None,
                )
                if requisito is None:
                    tarea.insumos_quimicos.append(
                        TareaInsumoQuimico(
                            insumo_quimico_id=quimicos[numero - 1].id,
                            cantidad=1.5 + (numero % 4) * 0.5,
                        )
                    )
                else:
                    requisito.cantidad = 1.5 + (numero % 4) * 0.5
                tareas.append(tarea)

            planes = []
            operadores = personas[1:]
            for numero in range(1, CANTIDAD + 1):
                operador = personas[1]
                nombre_plan = f"Plan POES {numero:02d}"
                plan, _ = obtener_o_crear(
                    db, Plan,
                    {"nombre": nombre_plan},
                    {
                        "responsable_id": operador.id,
                        "descripcion": f"Plan de prueba diario {numero:02d} generado con Faker.",
                        "activo": True,
                        "fecha_inicio": ayer,
                        "fecha_fin": None,
                        "sector_id": sectores[(numero - 1) % CANTIDAD].id,
                        "equipo_id": equipos[(numero - 1) % CANTIDAD].id,
                    },
                )
                plan.activo = True
                plan.fecha_inicio = ayer
                plan.fecha_fin = None
                plan.sector_id = sectores[(numero - 1) % CANTIDAD].id
                plan.equipo_id = equipos[(numero - 1) % CANTIDAD].id
                if tareas[numero - 1] not in plan.tareas:
                    plan.tareas.append(tareas[numero - 1])
                planes.append(plan)

            tipos_documento = list(TipoDocumento)
            for numero in range(1, CANTIDAD + 1):
                operador = operadores[(numero - 1) % len(operadores)]
                nombre_doc = f"Documento {numero:02d}"
                documento = db.scalar(
                    select(Documentacion).where(Documentacion.nombre == nombre_doc)
                )
                if documento is None:
                    documento = Documentacion(
                        nombre=nombre_doc,
                        tipo_documento=tipos_documento[(numero - 1) % len(tipos_documento)],
                        personal_id=operador.id,
                    )
                    db.add(documento)
                else:
                    documento.tipo_documento = tipos_documento[(numero - 1) % len(tipos_documento)]
                    documento.personal_id = operador.id

            db.flush()

            # Datos de ayer para que el historial y el reporte no aparezcan vacíos.
            for numero, plan in enumerate(planes, start=1):
                tarea = tareas[numero - 1]
                operador = personas[1]
                quimico = quimicos[numero - 1]
                momento = datetime.combine(ayer, time(hour=10, minute=numero % 60))

                item = db.scalar(
                    select(ItemChecklist).where(
                        ItemChecklist.plan_id == plan.id,
                        ItemChecklist.tarea_id == tarea.id,
                        ItemChecklist.periodo_inicio == ayer,
                    )
                )
                if item is None:
                    item = ItemChecklist(
                        plan_id=plan.id,
                        tarea_id=tarea.id,
                        responsable_id=operador.id,
                        realizada_por_id=operador.id,
                        frecuencia=FrecuenciaTarea.DIARIA,
                        periodo_inicio=ayer,
                        periodo_fin=ayer,
                        estado=EstadoItem.REALIZADA,
                        realizada_en=momento,
                    )
                    db.add(item)
                else:
                    item.responsable_id = operador.id
                    item.realizada_por_id = operador.id
                    item.estado = EstadoItem.REALIZADA
                    item.realizada_en = momento
                db.flush()

                movimiento = db.scalar(
                    select(MovimientoItemChecklist).where(
                        MovimientoItemChecklist.item_id == item.id,
                        MovimientoItemChecklist.accion == AccionMovimiento.REALIZADA,
                    )
                )
                if movimiento is None:
                    db.add(MovimientoItemChecklist(
                        item_id=item.id,
                        accion=AccionMovimiento.REALIZADA,
                        personal_id=operador.id,
                        fecha_hora=momento,
                    ))
                else:
                    movimiento.personal_id = operador.id
                    movimiento.fecha_hora = momento

                plan_realizado = db.scalar(
                    select(PlanRealizado).where(
                        PlanRealizado.plan_origen_id == plan.id,
                        func.date(PlanRealizado.fecha_ejecucion) == ayer.isoformat(),
                    )
                )
                if plan_realizado is None:
                    plan_realizado = PlanRealizado(
                        plan_origen_id=plan.id,
                        nombre=plan.nombre,
                        descripcion=plan.descripcion,
                        fecha_ejecucion=momento,
                        responsable_id=operador.id,
                        sector_id=plan.sector_id,
                        equipo_id=plan.equipo_id,
                    )
                    db.add(plan_realizado)
                    db.flush()
                else:
                    plan_realizado.nombre = plan.nombre
                    plan_realizado.descripcion = plan.descripcion
                    plan_realizado.responsable_id = operador.id
                    plan_realizado.sector_id = plan.sector_id
                    plan_realizado.equipo_id = plan.equipo_id

                tarea_realizada = db.scalar(
                    select(TareaRealizada).where(
                        TareaRealizada.plan_realizado_id == plan_realizado.id,
                        TareaRealizada.tarea_origen_id == tarea.id,
                    )
                )
                if tarea_realizada is None:
                    tarea_realizada = TareaRealizada(
                        plan_realizado_id=plan_realizado.id,
                        tarea_origen_id=tarea.id,
                        nombre=tarea.nombre,
                        frecuencia=tarea.frecuencia,
                        procedimiento=tarea.procedimiento,
                        fecha_registro=momento,
                        equipo_id=tarea.equipo_id,
                        elementos_utilizados=[{"id": elementos[numero - 1].id,
                                               "nombre": elementos[numero - 1].nombre}],
                        insumos_utilizados=[{"id": quimico.id, "cantidad": 1.0}],
                    )
                    db.add(tarea_realizada)

                nombre_consumo = f"Tarea diaria {numero:02d}"
                consumo = db.scalar(
                    select(ConsumoQuimico).where(
                        ConsumoQuimico.insumo_quimico_id == quimico.id,
                        ConsumoQuimico.fecha == ayer,
                        ConsumoQuimico.tarea_limpieza == nombre_consumo,
                    )
                )
                if consumo is None:
                    db.add(ConsumoQuimico(
                        insumo_quimico_id=quimico.id,
                        cantidad_utilizada=1.0,
                        fecha=ayer,
                        tarea_limpieza=nombre_consumo,
                        operario_id=operador.id,
                        activo=True,
                    ))
                else:
                    consumo.operario_id = operador.id
                    consumo.cantidad_utilizada = 1.0
                    consumo.activo = True

            db.commit()
            print("Seed SAIA cargado correctamente. No se borraron datos.")
            print("Se crearon/actualizaron 15 registros por catálogo principal y 15 registros históricos.")
            print(f"Administrador: admin / {PASSWORD_ADMIN}")
            print(f"Operario con 15 tareas diarias: opera / {PASSWORD_OPERARIO}")
            print("El checklist de hoy se genera al abrirlo; ayer queda cargado para el historial.")
        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    cargar_seed()
