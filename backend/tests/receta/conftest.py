import pytest

from src.aditivoReferencia.models import AditivoReferencia
from src.claseFuncional.models import ClaseFuncional
from src.insumos.constants import TipoInsumo
from src.insumos.models import Insumo
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico


@pytest.fixture
def conservante(db_session):
    clase = ClaseFuncional(nombre="Conservante", ins_opcional=False, activo=True)
    db_session.add(clase)
    db_session.commit()
    return clase


@pytest.fixture
def sorbato(db_session, conservante):
    aditivo = AditivoReferencia(
        clase_funcional_id=conservante.id, nombre="Sorbato de potasio", ins="202", activo=True
    )
    db_session.add(aditivo)
    db_session.commit()
    return aditivo


@pytest.fixture
def insumo_aditivo(db_session, unidad_medida, sorbato):
    insumo = Insumo(
        nombre="Sorbato de potasio en polvo",
        unidad_medida_id=unidad_medida.id,
        tipo=TipoInsumo.ADITIVO,
        aditivo_referencia_id=sorbato.id,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    return insumo


@pytest.fixture
def aditivo_sin_clase(db_session, unidad_medida):
    insumo = Insumo(
        nombre="Aditivo sin clasificar",
        unidad_medida_id=unidad_medida.id,
        tipo=TipoInsumo.ADITIVO,
        aditivo_referencia_id=None,
        activo=True,
    )
    db_session.add(insumo)
    db_session.commit()
    return insumo


@pytest.fixture
def quimico_que_no_es_ingrediente(db_session, unidad_medida, insumo_activo, otro_insumo_activo, insumo_aditivo):
    quimico = InsumoQuimico(
        id=max(insumo_activo.id, otro_insumo_activo.id, insumo_aditivo.id) + 100,
        nombre="Lavandina",
        cantidad=5,
        tipo_quimico=TipoQuimico.DESINFECTANTE,
        unidad_medida_id=unidad_medida.id,
        activo=True,
    )
    db_session.add(quimico)
    db_session.commit()
    return quimico


@pytest.fixture
def datos_receta(producto, unidad_medida, insumo_activo, otro_insumo_activo, insumo_aditivo):
    def armar(**cambios):
        datos = {
            "producto_id": producto.id,
            "rendimiento_cantidad": 10,
            "rendimiento_unidad_id": unidad_medida.id,
            "porcion_cantidad": 0.05,
            "porcion_unidad_id": unidad_medida.id,
            "porcion_medida_casera": "1 unidad",
            "renglones": [
                {"insumo_id": insumo_activo.id, "tipo": "ingrediente", "cantidad": 8, "unidad_medida_id": unidad_medida.id},
                {"insumo_id": otro_insumo_activo.id, "tipo": "ingrediente", "cantidad": 2, "unidad_medida_id": unidad_medida.id},
                {"insumo_id": insumo_aditivo.id, "tipo": "aditivo", "cantidad": 0.01, "unidad_medida_id": unidad_medida.id},
            ],
            "pasos": [
                {"nombre": "Mezclar", "procedimiento": "Mezclar los secos con el agua.", "tiempo_minutos": 10},
                {"nombre": "Hornear", "procedimiento": "Hornear hasta dorar.", "temperatura_celsius": 220, "punto_control": True},
            ],
        }
        datos.update(cambios)
        return datos

    return armar
