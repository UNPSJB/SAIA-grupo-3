
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from src.insumosQuimicos import services, schemas


def test_crud_y_reactivacion_maestro(db_session, unidad_medida):
    datos = dict(nombre='Químico de prueba', cantidad=10, tipo_quimico='detergente', unidad_medida_id=unidad_medida.id)
    registro = services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(**datos))
    id_ = registro.id
    assert services.leer_insumo_quimico(db_session, id_).nombre == datos['nombre']
    cambio = services.modificar_insumo_quimico(db_session, id_, schemas.InsumoQuimicoUpdate(**{'nombre': 'Modificado'}))
    assert cambio.nombre == 'Modificado'
    services.eliminar_insumo_quimico(db_session, id_)
    assert registro.activo is False
    with pytest.raises(HTTPException):
        services.leer_insumo_quimico(db_session, id_)
    assert services.listar_insumos_quimicos(db_session, mostrar_inactivos=True)['total'] >= 1
    registro = services.modificar_insumo_quimico(db_session, id_, schemas.InsumoQuimicoUpdate(activo=True))
    assert registro.activo is True


def test_duplicado_al_crear_y_modificar(db_session, unidad_medida):
    datos = dict(nombre='Químico de prueba', cantidad=10, tipo_quimico='detergente', unidad_medida_id=unidad_medida.id)
    services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(**datos))
    with pytest.raises(HTTPException):
        services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(**datos))
    datos['nombre'] = 'Otro registro'
    otro = services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(**datos))
    with pytest.raises(HTTPException):
        services.modificar_insumo_quimico(db_session, otro.id, schemas.InsumoQuimicoUpdate(**{'nombre': 'TEST' if 'insumosQuimicos' == 'unidadMedida' else 'Químico de prueba'}))


def test_detalle_inexistente(db_session):
    with pytest.raises(HTTPException) as error:
        services.leer_insumo_quimico(db_session, 999999)
    assert error.value.status_code == 404

@pytest.mark.parametrize('inactiva', [False, True])
def test_unidad_inexistente_o_inactiva(db_session, unidad_medida, inactiva):
    datos = dict(nombre='Químico de prueba', cantidad=10, tipo_quimico='detergente', unidad_medida_id=unidad_medida.id)
    if inactiva:
        unidad_medida.activo = False
        db_session.commit()
    else:
        datos['unidad_medida_id'] = 999999
    with pytest.raises(HTTPException):
        services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(**datos))

@pytest.mark.parametrize('cantidad', [-1, 'NaN', 'Infinity'])
def test_cantidad_quimica_invalida(unidad_medida, cantidad):
    with pytest.raises(ValidationError):
        schemas.InsumoQuimicoCreate(nombre='Prueba', cantidad=cantidad, tipo_quimico='detergente', unidad_medida_id=unidad_medida.id)


def test_tipo_quimico_invalido(unidad_medida):
    with pytest.raises(ValidationError):
        schemas.InsumoQuimicoCreate(nombre='Prueba', cantidad=0, tipo_quimico='inexistente', unidad_medida_id=unidad_medida.id)


def test_filtrar_por_tipo(db_session, unidad_medida):
    services.crear_insumo_quimico(db_session, schemas.InsumoQuimicoCreate(nombre='Detergente', cantidad=2, tipo_quimico='detergente', unidad_medida_id=unidad_medida.id))
    resultado = services.listar_insumos_quimicos(db_session, tipo_quimico='detergente')
    assert resultado['total'] == 1
    assert resultado['items'][0].nombre == 'Detergente'
