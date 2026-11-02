
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from src.unidadMedida import services, schemas


def test_crud_y_reactivacion_maestro(db_session, unidad_medida):
    datos = dict(tipo='peso', sufijo='TEST')
    registro = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(**datos))
    id_ = registro.id
    assert services.leer_unidad_medida(db_session, id_).sufijo == datos['sufijo']
    cambio = services.modificar_unidad_medida(db_session, id_, schemas.UnidadMedidaUpdate(**{'sufijo': 'Modificado'}))
    assert cambio.sufijo == 'Modificado'
    services.eliminar_unidad_medida(db_session, id_)
    assert registro.activo is False
    with pytest.raises(HTTPException):
        services.leer_unidad_medida(db_session, id_)
    assert services.listar_unidades_medida(db_session, mostrar_inactivos=True)['total'] >= 1
    registro = services.modificar_unidad_medida(db_session, id_, schemas.UnidadMedidaUpdate(activo=True))
    assert registro.activo is True


def test_duplicado_al_crear_y_modificar(db_session, unidad_medida):
    datos = dict(tipo='peso', sufijo='TEST')
    services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(**datos))
    with pytest.raises(HTTPException):
        services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(**datos))
    datos['sufijo'] = 'Otro registro'
    otro = services.crear_unidad_medida(db_session, schemas.UnidadMedidaCreate(**datos))
    with pytest.raises(HTTPException):
        services.modificar_unidad_medida(db_session, otro.id, schemas.UnidadMedidaUpdate(**{'sufijo': 'TEST' if 'unidadMedida' == 'unidadMedida' else 'Químico de prueba'}))


def test_detalle_inexistente(db_session):
    with pytest.raises(HTTPException) as error:
        services.leer_unidad_medida(db_session, 999999)
    assert error.value.status_code == 404

def test_tipo_unidad_invalido():
    with pytest.raises(ValidationError):
        schemas.UnidadMedidaCreate(tipo='inexistente', sufijo='X')
