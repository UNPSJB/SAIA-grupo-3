import pytest

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.nutricion.models import AlimentoReferencia
from src.producto.models import Producto
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida
from tests.nutricion.utilidades import REFERENCIA, cargar_referencia, crear_receta, datos_version


@pytest.fixture
def harina_referencia(db_session):
    alimento = AlimentoReferencia(
        fuente="DEMO",
        codigo="DEMO-001",
        nombre="Harina de trigo 000",
        energia_kcal=340,
        carbohidratos_g=72,
        azucares_totales_g=0.3,
        proteinas_g=10,
        grasas_totales_g=1,
        grasas_saturadas_g=0.2,
        grasas_trans_g=0,
        fibra_g=2.7,
        sodio_mg=2,
    )
    db_session.add(alimento)
    db_session.commit()
    return alimento


@pytest.fixture
def aditivo(db_session, unidad_medida):
    insumo = Insumo(nombre="Bicarbonato", unidad_medida_id=unidad_medida.id, tipo=TipoInsumo.ADITIVO, activo=True)
    db_session.add(insumo)
    db_session.commit()
    return insumo


@pytest.fixture
def unidades(db_session):
    creadas = {
        "g": UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="g", activo=True, factor_base=1),
        "L": UnidadMedida(tipo=TipoUnidadMedida.CAPACIDAD, sufijo="L", activo=True, factor_base=1000),
        "un": UnidadMedida(tipo=TipoUnidadMedida.UNIDAD, sufijo="un", activo=True, factor_base=1),
    }
    db_session.add_all(creadas.values())
    db_session.commit()
    return creadas


@pytest.fixture
def ingredientes(db_session, unidades):
    creados = {}
    for ingrediente in REFERENCIA["ingredientes"]:
        insumo = Insumo(nombre=ingrediente["nombre"], unidad_medida_id=unidades["g"].id, tipo=TipoInsumo.INGREDIENTE, activo=True)
        db_session.add(insumo)
        creados[ingrediente["nombre"]] = insumo
    db_session.commit()
    return creados


@pytest.fixture
def nuevo_producto(db_session, unidades):
    def crear(nombre):
        producto = Producto(nombre=nombre, unidad_medida_id=unidades["g"].id, activo=True)
        db_session.add(producto)
        db_session.commit()
        return producto.id

    return crear


@pytest.fixture
def leudante(db_session, unidades):
    clase = ClaseFuncional(nombre="Leudante", ins_opcional=False, activo=True)
    db_session.add(clase)
    db_session.flush()
    referencia = AditivoReferencia(clase_funcional_id=clase.id, nombre="Bicarbonato de sodio", ins="500ii", activo=True)
    db_session.add(referencia)
    db_session.flush()
    insumo = Insumo(
        nombre="Bicarbonato de sodio",
        unidad_medida_id=unidades["g"].id,
        tipo=TipoInsumo.ADITIVO,
        aditivo_referencia_id=referencia.id,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    return insumo


@pytest.fixture
def receta_referencia_incompleta(client, headers_administradora, unidades, ingredientes, nuevo_producto, db_session):
    cargar_referencia(client, headers_administradora, ingredientes)
    semillas = Insumo(nombre="Semillas", unidad_medida_id=unidades["g"].id, tipo=TipoInsumo.INGREDIENTE, activo=True)
    db_session.add(semillas)
    db_session.commit()
    datos = datos_version(unidades, ingredientes)
    datos["renglones"].append(
        {"insumo_id": semillas.id, "tipo": "ingrediente", "cantidad": 10, "unidad_medida_id": unidades["g"].id}
    )
    receta = crear_receta(client, headers_administradora, nuevo_producto("Pan con semillas"), datos)
    return receta["version_vigente"]["id"]
