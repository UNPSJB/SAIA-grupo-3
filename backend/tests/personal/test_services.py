import pytest

from src.auth.utils import password_hash
from src.personal import exceptions, schemas, services
from tests.database import (
    PASSWORD_ACTUAL,
    db_session,
    documentos_de_persona,
    persona_con_password,
    persona_operadora,
    personas_con_vencimientos,
)


def datos_de_alta(**cambios):
    datos = {
        "nombre": "Nueva",
        "apellido": "Persona",
        "dni": "900",
        "nroLegajo": "L-900",
        "email": "nueva.persona@example.com",
        "username": "nueva_persona",
        "password": "clave-segura-123",
        "operar": True,
    }
    datos.update(cambios)
    return schemas.PersonalCreate(**datos)


def test_crear_personal_guarda_password_encriptada(db_session):
    # Arrange
    datos = datos_de_alta()

    # Act
    persona = services.crear_personal(db_session, datos)

    # Assert
    assert persona.id is not None
    assert persona.activo is True
    assert persona.hashed_password != datos.password
    assert password_hash.verify(datos.password, persona.hashed_password)


@pytest.mark.parametrize(
    ("campo", "valor", "excepcion_esperada", "detalle"),
    [
        ("dni", "100", exceptions.DniDuplicado, "El DNI ya existe."),
        ("nroLegajo", "100", exceptions.NroLegajoDuplicado, "El número de legajo ya existe."),
        ("email", "operadora@example.com", exceptions.EmailDuplicado, "El email ya existe."),
        ("username", "operadora", exceptions.UsernameDuplicado, "El nombre de usuario ya existe."),
    ],
)
def test_datos_duplicados_lanzan_error(
    db_session, persona_operadora, campo, valor, excepcion_esperada, detalle
):
    # Arrange
    datos = datos_de_alta(**{campo: valor})

    # Act / Assert
    with pytest.raises(excepcion_esperada) as error:
        services.crear_personal(db_session, datos)

    assert error.value.STATUS_CODE == 400
    assert error.value.DETAIL == detalle


def test_modificar_datos_y_password(db_session, persona_con_password):
    # Arrange
    nueva_password = "nueva-clave-456"
    datos = schemas.PersonalUpdate(
        nombre="Lucía Modificada",
        email="lucia.modificada@example.com",
        password=nueva_password,
    )

    # Act
    persona = services.modificar_personal(db_session, persona_con_password.id, datos)

    # Assert
    assert persona.nombre == "Lucía Modificada"
    assert persona.email == "lucia.modificada@example.com"
    assert password_hash.verify(nueva_password, persona.hashed_password)
    assert not password_hash.verify(PASSWORD_ACTUAL, persona.hashed_password)


def test_baja_logica_deja_registro_inactivo(db_session, persona_operadora):
    # Act
    persona = services.eliminar_personal(db_session, persona_operadora.id)

    # Assert
    assert persona.activo is False
    with pytest.raises(exceptions.PersonalNoEncontrado):
        services.leer_personal(db_session, persona_operadora.id)
    encontrada = services.leer_personal(db_session, persona_operadora.id, incluir_inactivos=True)
    assert encontrada.id == persona_operadora.id


def test_no_permite_baja_con_documentacion(db_session, persona_con_password, documentos_de_persona):
    # Act / Assert
    with pytest.raises(exceptions.PersonalTieneDocumentacion):
        services.eliminar_personal(db_session, persona_con_password.id)

    assert persona_con_password.activo is True


def test_filtro_proximos_a_vencer(db_session, personas_con_vencimientos):
    # Act
    resultado = services.listar_personal(db_session, proximos_a_vencer=True)

    # Assert
    ids_esperados = {
        personas_con_vencimientos["vencida"].id,
        personas_con_vencimientos["por_vencer"].id,
    }
    assert resultado["total"] == 2
    assert {persona.id for persona in resultado["items"]} == ids_esperados
