import pytest
from fastapi import HTTPException
from src.producto import services, schemas


def test_crud_producto_con_unidad(db_session, unidad_medida):
    p = services.crear_producto(db_session, schemas.ProductoCreate(nombre='Pan de prueba', unidad_medida_id=unidad_medida.id))
    assert services.leer_producto(db_session, p.id).nombre == 'Pan de prueba'
    assert services.modificar_producto(db_session, p.id, schemas.ProductoUpdate(nombre='Otro pan')).nombre == 'Otro pan'
    services.eliminar_producto(db_session, p.id)
    assert not p.activo
    assert services.modificar_producto(db_session,p.id,schemas.ProductoUpdate(activo=True)).activo


def test_producto_duplicado_y_unidad_inactiva(db_session, unidad_medida):
    datos = schemas.ProductoCreate(nombre='Pan', unidad_medida_id=unidad_medida.id)
    services.crear_producto(db_session,datos)
    with pytest.raises(HTTPException): services.crear_producto(db_session,datos)
    unidad_medida.activo=False; db_session.commit()
    with pytest.raises(HTTPException): services.crear_producto(db_session,schemas.ProductoCreate(nombre='Otro',unidad_medida_id=unidad_medida.id))
