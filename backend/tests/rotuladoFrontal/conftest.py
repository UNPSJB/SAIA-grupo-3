import pytest

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.producto.models import Producto
from src.unidadMedida.models import TipoUnidadMedida, UnidadMedida

from scripts.datos_iniciales_rotulado_frontal import cargar_parametros_iniciales


@pytest.fixture
def parametros(db_session):
    conjunto = cargar_parametros_iniciales(db_session)
    db_session.commit()
    return conjunto.id


@pytest.fixture
def unidad_gramo(db_session):
    unidad = UnidadMedida(tipo=TipoUnidadMedida.PESO, sufijo="g", activo=True, factor_base=1)
    db_session.add(unidad)
    db_session.commit()
    return unidad


@pytest.fixture
def ingredientes_rotulado(db_session, unidad_gramo):
    def crear(nombre, **marcas):
        insumo = Insumo(nombre=nombre, unidad_medida_id=unidad_gramo.id, tipo=TipoInsumo.INGREDIENTE, activo=True, **marcas)
        db_session.add(insumo)
        return insumo

    creados = {
        "harina": crear("Harina"),
        "agua": crear("Agua"),
        "azucar": crear("Azúcar", es_azucar_anadido=True),
        "aceite": crear("Aceite", es_grasa_anadida=True),
        "sal": crear("Sal", aporta_sodio_anadido=True),
        "cafe": crear("Café soluble", contiene_cafeina=True),
    }
    db_session.commit()
    return creados


@pytest.fixture
def edulcorante(db_session, unidad_gramo):
    clase = ClaseFuncional(nombre="Edulcorante", ins_opcional=False, es_edulcorante=True, activo=True)
    db_session.add(clase)
    db_session.flush()
    referencia = AditivoReferencia(clase_funcional_id=clase.id, nombre="Sucralosa", ins="955", activo=True)
    db_session.add(referencia)
    db_session.flush()
    insumo = Insumo(
        nombre="Sucralosa en polvo",
        unidad_medida_id=unidad_gramo.id,
        tipo=TipoInsumo.ADITIVO,
        aditivo_referencia_id=referencia.id,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    return insumo


@pytest.fixture
def producto_con_receta(client, headers_administradora, db_session, unidad_gramo, ingredientes_rotulado, parametros):
    def crear(nombre, claves, aditivos=()):
        producto = Producto(nombre=nombre, unidad_medida_id=unidad_gramo.id, activo=True)
        db_session.add(producto)
        db_session.commit()
        renglones = [
            {"insumo_id": ingredientes_rotulado[c].id, "tipo": "ingrediente", "cantidad": 100, "unidad_medida_id": unidad_gramo.id}
            for c in claves
        ]
        renglones += [
            {"insumo_id": a.id, "tipo": "aditivo", "cantidad": 1, "unidad_medida_id": unidad_gramo.id} for a in aditivos
        ]
        respuesta = client.post(
            "/recetas/",
            headers=headers_administradora,
            json={
                "producto_id": producto.id,
                "rendimiento_cantidad": 1000,
                "rendimiento_unidad_id": unidad_gramo.id,
                "renglones": renglones,
            },
        )
        assert respuesta.status_code == 200, respuesta.text
        return producto.id

    return crear
