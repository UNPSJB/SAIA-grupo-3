import pytest
from pydantic import ValidationError

from src.insumos import schemas, services
from src.insumos.models import Insumo
from tests.database import (
    db_session,
    insumo_activo,
    lote_recepcion,
    persona_administradora,
    proveedor_activo,
    unidad_medida,
)


def test_crear_insumo_sin_stock_inicial(db_session, unidad_medida):
    creado = services.crear_insumo(
        db_session,
        schemas.InsumoCreate(
            nombre="Harina",
            unidad_medida_id=unidad_medida.id,
        ),
    )

    assert creado.cantidad == 0
    assert "cantidad" not in Insumo.__table__.columns


@pytest.mark.parametrize(
    "datos",
    [
        {"nombre": "Harina", "unidad_medida_id": 1, "cantidad": 50},
        {"nombre": "Harina", "unidad_medida_id": 1, "cantidad": 0},
    ],
)
def test_schema_catalogo_no_acepta_cantidad(datos):
    with pytest.raises(ValidationError):
        schemas.InsumoCreate(**datos)


def test_schema_actualizacion_catalogo_no_acepta_cantidad():
    with pytest.raises(ValidationError):
        schemas.InsumoUpdate(cantidad=50)


def test_cantidad_de_lectura_se_calcula_desde_recepciones(
    db_session,
    insumo_activo,
    lote_recepcion,
):
    db_session.refresh(insumo_activo)

    assert insumo_activo.cantidad == lote_recepcion.cantidad_disponible

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from src.insumos import services, schemas


def test_crud_y_reactivacion_maestro(db_session, unidad_medida):
    datos = dict(nombre='Insumo de prueba', unidad_medida_id=unidad_medida.id)
    registro = services.crear_insumo(db_session, schemas.InsumoCreate(**datos))
    id_ = registro.id
    assert services.leer_insumo(db_session, id_).nombre == datos['nombre']
    cambio = services.modificar_insumo(db_session, id_, schemas.InsumoUpdate(**{'nombre': 'Modificado'}))
    assert cambio.nombre == 'Modificado'
    services.eliminar_insumo(db_session, id_)
    assert registro.activo is False
    with pytest.raises(HTTPException):
        services.leer_insumo(db_session, id_)
    assert services.listar_insumos(db_session, mostrar_inactivos=True)['total'] >= 1
    registro = services.modificar_insumo(db_session, id_, schemas.InsumoUpdate(activo=True))
    assert registro.activo is True


def test_duplicado_al_crear_y_modificar(db_session, unidad_medida):
    datos = dict(nombre='Insumo de prueba', unidad_medida_id=unidad_medida.id)
    services.crear_insumo(db_session, schemas.InsumoCreate(**datos))
    with pytest.raises(HTTPException):
        services.crear_insumo(db_session, schemas.InsumoCreate(**datos))
    datos['nombre'] = 'Otro registro'
    otro = services.crear_insumo(db_session, schemas.InsumoCreate(**datos))
    with pytest.raises(HTTPException):
        services.modificar_insumo(db_session, otro.id, schemas.InsumoUpdate(**{'nombre': 'TEST' if 'insumos' == 'unidadMedida' else 'Insumo de prueba'}))


def test_detalle_inexistente(db_session):
    with pytest.raises(HTTPException) as error:
        services.leer_insumo(db_session, 999999)
    assert error.value.status_code == 404

@pytest.mark.parametrize('inactiva', [False, True])
def test_unidad_inexistente_o_inactiva(db_session, unidad_medida, inactiva):
    datos = dict(nombre='Insumo de prueba', unidad_medida_id=unidad_medida.id)
    if inactiva:
        unidad_medida.activo = False
        db_session.commit()
    else:
        datos['unidad_medida_id'] = 999999
    with pytest.raises(HTTPException):
        services.crear_insumo(db_session, schemas.InsumoCreate(**datos))
