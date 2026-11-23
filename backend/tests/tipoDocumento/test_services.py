import pytest

from src.tipoDocumento import exceptions, schemas, services


def test_crear_modificar_y_baja_logica_tipo_documento(db_session):
    creado = services.crear_tipo_documento(
        db_session, schemas.TipoDocumentoCreate(nombre="  Libreta sanitaria  ")
    )

    assert creado.id is not None
    assert creado.nombre == "Libreta sanitaria"
    assert creado.activo is True
    assert services.leer_tipo_documento(db_session, creado.id).nombre == "Libreta sanitaria"

    modificado = services.modificar_tipo_documento(
        db_session, creado.id, schemas.TipoDocumentoUpdate(nombre="Libreta sanitaria vigente")
    )
    assert modificado.nombre == "Libreta sanitaria vigente"

    baja = services.eliminar_tipo_documento(db_session, creado.id)
    assert baja.activo is False

    with pytest.raises(exceptions.TipoDocumentoNoEncontrado):
        services.leer_tipo_documento(db_session, creado.id)

    assert services.leer_tipo_documento(db_session, creado.id, incluir_inactivos=True).activo is False

    reactivado = services.modificar_tipo_documento(
        db_session, creado.id, schemas.TipoDocumentoUpdate(activo=True)
    )
    assert reactivado.activo is True


@pytest.mark.parametrize("nombre_duplicado", ["Carnet de manipulador", "CARNET DE MANIPULADOR", "  carnet de manipulador  "])
def test_tipo_documento_nombre_duplicado_lanza_error(db_session, nombre_duplicado):
    services.crear_tipo_documento(
        db_session, schemas.TipoDocumentoCreate(nombre="Carnet de manipulador")
    )

    with pytest.raises(exceptions.TipoDocumentoDuplicado):
        services.crear_tipo_documento(
            db_session, schemas.TipoDocumentoCreate(nombre=nombre_duplicado)
        )


def test_modificar_tipo_documento_a_nombre_existente_lanza_error(db_session):
    services.crear_tipo_documento(db_session, schemas.TipoDocumentoCreate(nombre="Carnet"))
    otro = services.crear_tipo_documento(db_session, schemas.TipoDocumentoCreate(nombre="Apto físico"))

    with pytest.raises(exceptions.TipoDocumentoDuplicado):
        services.modificar_tipo_documento(
            db_session, otro.id, schemas.TipoDocumentoUpdate(nombre="CARNET")
        )