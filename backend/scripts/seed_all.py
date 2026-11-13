"""Carga todos los datos demo: ejecutar desde backend con python -m scripts.seed_all."""

from datetime import date, timedelta

from sqlalchemy import func, inspect, select

from scripts.seed_abastecimiento import cargar_abastecimiento_demo, cargar_recepciones_ingredientes
from scripts.seed_calibraciones import cargar_calibraciones
from scripts.seed_checklist import cargar_checklist
from scripts.seed_common import (
    CANTIDAD,
    FOTOS,
    PASSWORD_ADMIN,
    PASSWORD_OPERARIO,
    foto_contexto,
    obtener_o_crear,
)
from scripts.seed_documentacion import cargar_documentacion
from scripts.seed_documentos_tecnicos import cargar_documentos_tecnicos
from scripts.seed_elementos import cargar_elementos
from scripts.seed_equipos import cargar_equipos
from scripts.seed_temperaturas import cargar_temperaturas
from scripts.seed_incidentes import cargar_incidentes
from scripts.seed_insumos import cargar_insumos
from scripts.seed_insumos_quimicos import cargar_insumos_quimicos
from scripts.seed_lotes_produccion import cargar_lotes_produccion
from scripts.seed_personal import cargar_personal
from scripts.seed_planes import cargar_planes
from scripts.seed_produccion_del_dia import cargar_pasos_lotes
from scripts.seed_productos import cargar_productos
from scripts.seed_recetas import cargar_recepciones_aditivos, cargar_recetas
from scripts.seed_sectores import cargar_sectores
from scripts.seed_tareas import cargar_tareas
from scripts.seed_stock_minimo import cargar_stock_minimo
from scripts.seed_unidades_medida import cargar_unidades_medida
from src.config import ARCHIVOS_DIR, UPLOADS_DIR
from src.database import SessionLocal, engine
from src.main import app  # noqa: F401 — registra todos los modelos
from src.models import ModeloBase


def cargar_seed(*, session_factory=SessionLocal, db_engine=engine, hoy=None):
    """Coordina las dependencias y confirma la carga completa en una transacción.

    Repetir la carga conserva contraseñas y saldos existentes.
    Completa el origen ficticio de consumos demo antiguos, sin volver a descontarlos.
    Las producciones nuevas registran su consumo una sola vez.
    """
    hoy = hoy or date.today()
    ayer = hoy - timedelta(days=1)
    fotos = [foto_contexto(i, UPLOADS_DIR) for i in range(len(FOTOS))]
    ModeloBase.metadata.create_all(bind=db_engine)
    resumen = {}

    with session_factory() as db:
        try:
            def crear(modelo, filtros, **valores):
                registro, nuevo = obtener_o_crear(db, modelo, filtros, valores)
                resumen[modelo.__name__] = resumen.get(modelo.__name__, 0) + int(nuevo)
                return registro, nuevo

            personas, operadores, admin = cargar_personal(crear)
            unidades, unidades_por_sufijo = cargar_unidades_medida(crear)
            sectores = cargar_sectores(crear)
            equipos = cargar_equipos(crear, sectores)
            cargar_temperaturas(db, crear, sectores, operadores, hoy)
            insumos_maestros, ingredientes = cargar_insumos(crear, unidades, unidades_por_sufijo)
            quimicos = cargar_insumos_quimicos(crear, unidades_por_sufijo)
            elementos = cargar_elementos(crear, hoy)
            tareas = cargar_tareas(crear, equipos, elementos, quimicos)
            planes = cargar_planes(crear, sectores, equipos, tareas, personas, admin, ayer)
            cargar_documentacion(crear, operadores, hoy)
            cargar_incidentes(crear, personas, operadores, admin, hoy, fotos)
            cargar_documentos_tecnicos(crear, admin, ayer, ARCHIVOS_DIR)
            cargar_calibraciones(crear, equipos, hoy, UPLOADS_DIR)
            cargar_checklist(
                crear, equipos, planes, tareas, quimicos, elementos, fotos, hoy, ayer
            )
            productos = cargar_productos(crear, unidades_por_sufijo)
            _, aditivos = cargar_recetas(crear, productos, ingredientes, unidades_por_sufijo, equipos, admin)
            proveedores = cargar_abastecimiento_demo(
                db, crear, unidades_por_sufijo, admin.id, hoy, insumos_maestros
            )
            cargar_recepciones_ingredientes(db, crear, ingredientes, proveedores, admin.id, hoy)
            cargar_recepciones_aditivos(db, crear, aditivos, proveedores, admin.id, hoy)
            cargar_lotes_produccion(
                db, crear, productos, ingredientes, operadores, admin, hoy, proveedores,
                autores_demo={p.id for p in personas},
            )
            cargar_pasos_lotes(db, crear)
            cargar_stock_minimo(db, crear, unidades_por_sufijo, proveedores, admin, hoy)

            db.flush()
            conteos = {
                m.class_.__name__: db.scalar(select(func.count()).select_from(m.class_))
                for m in ModeloBase.registry.mappers
            }
            # La configuración pública es opcional y los tipos son un catálogo corto.
            faltantes = {
                nombre: total
                for nombre, total in conteos.items()
                if nombre not in {"ConfiguracionVistaPublica", "ConfiguracionProduccion", "ConsumoStockAnterior"}
                and total < (1 if nombre == "TipoIncidente" else CANTIDAD)
            }
            if faltantes:
                raise RuntimeError(f"Modelos con menos de {CANTIDAD} registros: {faltantes}")
            db.commit()
        except Exception:
            db.rollback()
            raise

    print("Seed SAIA cargado sin borrar registros ni reiniciar saldos. Ingresos y consumos demo aplicados una sola vez.")
    print("Los consumos demo antiguos se completan con recepciones ficticias DEMO-HIST; no se modifica el origen de producciones reales.")
    for nombre in sorted(conteos):
        print(f"  {nombre}: {conteos[nombre]} totales; {resumen.get(nombre, 0)} nuevos")
    print("Fotografías de contexto reales; perfiles ficticios y documentos de demostración.")
    print("Probá los casos 'DEMO stock': normal, mínimo, bajo, vacío, cero y repuesto. Los preparados consumen 1 kg / 1 L.")
    print(f"admin: {PASSWORD_ADMIN}; opera y nuevos perfiles: {PASSWORD_OPERARIO} (se conservan contraseñas existentes).")


def comprobar_estructura(db_engine=engine):
    """Detecta la estructura histórica de incidentes sin modificarla."""
    inspector = inspect(db_engine)
    if not inspector.has_table("incidentes"):
        return
    columnas = {columna["name"] for columna in inspector.get_columns("incidentes")}
    if "tipo_id" not in columnas or "tipo" in columnas:
        raise RuntimeError(
            "La base tiene una estructura vieja de incidentes. "
            "Usá una base nueva para pruebas o migrá la existente. "
            "El seed no modifica columnas ni elimina datos."
        )


if __name__ == "__main__":
    comprobar_estructura()
    cargar_seed()
