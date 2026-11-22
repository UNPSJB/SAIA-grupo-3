import pytest
from fastapi import HTTPException

from src.insumos.constants import TipoInsumo
from src.producto import schemas, services
from src.receta.constants import EstadoVersionReceta
from src.receta.models import Receta, RenglonReceta, VersionReceta


def test_crud_producto_con_unidad(db_session, unidad_medida):
    p = services.crear_producto(db_session, schemas.ProductoCreate(nombre='Pan de prueba', unidad_medida_id=unidad_medida.id))
    assert services.leer_producto(db_session, p.id).nombre == 'Pan de prueba'
    assert services.modificar_producto(db_session, p.id, schemas.ProductoUpdate(nombre='Otro pan')).nombre == 'Otro pan'
    services.eliminar_producto(db_session, p.id)
    assert not p.activo
    assert services.modificar_producto(db_session, p.id, schemas.ProductoUpdate(activo=True)).activo


def test_producto_duplicado_y_unidad_inactiva(db_session, unidad_medida):
    datos = schemas.ProductoCreate(nombre='Pan', unidad_medida_id=unidad_medida.id)
    services.crear_producto(db_session, datos)
    with pytest.raises(HTTPException):
        services.crear_producto(db_session, datos)
    unidad_medida.activo = False
    db_session.commit()
    with pytest.raises(HTTPException):
        services.crear_producto(db_session, schemas.ProductoCreate(nombre='Otro', unidad_medida_id=unidad_medida.id))


def test_leer_producto_detalle_sin_receta_devuelve_none(db_session, producto):
    detalle = services.leer_producto_detalle(db_session, producto.id)

    assert detalle.id == producto.id
    assert detalle.nombre == producto.nombre
    assert detalle.receta is None


def test_leer_producto_detalle_devuelve_version_vigente_con_insumos_y_rendimiento(
    db_session, producto, unidad_medida, insumo_activo, otro_insumo_activo, persona_administradora
):
    receta = Receta(producto_id=producto.id)
    db_session.add(receta)
    db_session.flush()

    v1 = VersionReceta(
        receta_id=receta.id,
        numero=1,
        estado=EstadoVersionReceta.ARCHIVADA,
        motivo="Versión inicial",
        rendimiento_cantidad=10,
        rendimiento_unidad_id=unidad_medida.id,
        creado_por_id=persona_administradora.id,
    )
    v2 = VersionReceta(
        receta_id=receta.id,
        numero=2,
        estado=EstadoVersionReceta.VIGENTE,
        motivo="Ajuste de proporciones",
        rendimiento_cantidad=20,
        rendimiento_unidad_id=unidad_medida.id,
        creado_por_id=persona_administradora.id,
    )
    db_session.add_all([v1, v2])
    db_session.flush()

    db_session.add_all([
        RenglonReceta(
            version_id=v1.id,
            orden=1,
            insumo_id=insumo_activo.id,
            tipo=TipoInsumo.INGREDIENTE,
            cantidad=5,
            unidad_medida_id=unidad_medida.id,
        ),
        RenglonReceta(
            version_id=v2.id,
            orden=1,
            insumo_id=insumo_activo.id,
            tipo=TipoInsumo.INGREDIENTE,
            cantidad=8,
            unidad_medida_id=unidad_medida.id,
        ),
        RenglonReceta(
            version_id=v2.id,
            orden=2,
            insumo_id=otro_insumo_activo.id,
            tipo=TipoInsumo.INGREDIENTE,
            cantidad=2.5,
            unidad_medida_id=unidad_medida.id,
        ),
    ])
    db_session.commit()

    detalle = services.leer_producto_detalle(db_session, producto.id)

    assert detalle.receta is not None
    assert detalle.receta.receta_id == receta.id
    assert detalle.receta.version_numero == 2
    assert detalle.receta.rendimiento_cantidad == 20
    assert detalle.receta.rendimiento_unidad.sufijo == unidad_medida.sufijo
    assert [
        (i.insumo_nombre, i.cantidad_requerida, i.unidad_medida.sufijo)
        for i in detalle.receta.insumos
    ] == [
        (insumo_activo.nombre, 8, unidad_medida.sufijo),
        (otro_insumo_activo.nombre, 2.5, unidad_medida.sufijo),
    ]