from datetime import date

from sqlalchemy import func, select

from scripts.datos_iniciales_rotulado_frontal import cargar_parametros_iniciales
from scripts.panificadora import abastecimiento, calidad, limpieza, maestros, produccion, productos
from scripts.seed_common import FOTOS, PASSWORD_ADMIN, PASSWORD_OPERARIO, foto_contexto, obtener_o_crear
from src.config import ARCHIVOS_DIR, UPLOADS_DIR
from src.database import SessionLocal, engine
import src.main
from src.models import ModeloBase
from src.notificaciones.services import revisar_stock_insumo
from src.personal.models import Personal
from src.producto.models import Producto


class BaseConDatos(RuntimeError):
    pass


def _revisar_stock(db, insumos):
    for insumo in insumos:
        if insumo.stock_minimo is not None:
            db.refresh(insumo)
            revisar_stock_insumo(db, insumo, confirmar=False)


def cargar(*, session_factory=SessionLocal, db_engine=engine, hoy=None):
    hoy = hoy or date.today()
    ModeloBase.metadata.create_all(bind=db_engine)
    with session_factory() as db:
        if db.scalar(select(Personal.id).limit(1)) or db.scalar(select(Producto.id).limit(1)):
            raise BaseConDatos(
                "La base ya tiene datos. Este seed es para una base nueva: "
                "borrá db.sqlite3 y volvé a ejecutarlo.")
        resumen = {}

        def crear(modelo, filtros, **valores):
            registro, nuevo = obtener_o_crear(db, modelo, filtros, valores)
            resumen[modelo.__name__] = resumen.get(modelo.__name__, 0) + int(nuevo)
            return registro, nuevo

        try:
            fotos = [foto_contexto(i, UPLOADS_DIR) for i in range(len(FOTOS))]
            personas = maestros.cargar_personal(crear)
            operadores = [p for p in personas.values() if p.operar and p.activo]
            admin = personas["admin"]
            unidades = maestros.cargar_unidades(crear)
            sectores = maestros.cargar_sectores(crear)
            equipos = maestros.cargar_equipos(crear, sectores)
            calidad.cargar_temperaturas(crear, equipos, operadores, hoy)
            calidad.cargar_calibraciones(crear, equipos, hoy, UPLOADS_DIR)
            generales, ingredientes, aditivos = maestros.cargar_insumos(crear, unidades)
            quimicos = maestros.cargar_quimicos(crear, unidades)
            elementos = maestros.cargar_elementos(crear, hoy)
            tareas = limpieza.cargar_tareas(crear, equipos, quimicos, elementos)
            planes = limpieza.cargar_planes(crear, sectores, equipos, tareas, personas, hoy)
            db.flush()
            limpieza.cargar_historial_checklist(db, crear, planes, fotos, hoy)
            calidad.cargar_documentacion(crear, personas, hoy)
            calidad.cargar_incidentes(crear, personas, fotos, hoy)
            calidad.cargar_documentos_tecnicos(crear, personas, hoy, ARCHIVOS_DIR)

            catalogo = productos.cargar_productos(crear, unidades)
            versiones = productos.cargar_recetas(db, crear, catalogo, ingredientes, aditivos, unidades, equipos, admin, hoy)
            productos.cargar_nutricion(db, ingredientes, aditivos, admin)
            productos.calcular_nutricion_recetas(db, versiones)
            cargar_parametros_iniciales(db)
            productos.cargar_rotulado_frontal(db, catalogo, ingredientes, aditivos, admin)
            por_alergeno = productos.cargar_alergenos(db, ingredientes, aditivos)
            productos.cargar_rotulos(db, catalogo, unidades, por_alergeno, admin)

            proveedores = abastecimiento.cargar_proveedores(crear, hoy)
            planificados = produccion.planificar(versiones, hoy)
            abastecimiento.cargar_recepciones(crear, proveedores, generales, ingredientes, aditivos,
                planificados, personas["lucas.molina"], hoy)
            db.flush()
            produccion.cargar_lotes(db, crear, planificados, {**ingredientes, **aditivos}, personas, hoy)

            _revisar_stock(db, [*generales.values(), *ingredientes.values(), *quimicos.values()])
            db.flush()
            conteos = {
                m.class_.__name__: db.scalar(select(func.count()).select_from(m.class_))
                for m in ModeloBase.registry.mappers
            }
            db.commit()
        except Exception:
            db.rollback()
            raise
    return conteos, resumen


def main():
    try:
        conteos, _ = cargar()
    except BaseConDatos as error:
        print(error)
        raise SystemExit(1)
    print("Seed de la Panificadora La Espiga Dorada cargado.")
    for nombre in sorted(conteos):
        if conteos[nombre]:
            print(f"  {nombre}: {conteos[nombre]}")
    print(f"Usuarios: admin / {PASSWORD_ADMIN} (calidad, ambos roles); admin.solo, opera y el resto del personal / {PASSWORD_OPERARIO}.")


if __name__ == "__main__":
    main()
