from datetime import date

import pytest

from src.auth.utils import password_hash
from src.perfil import exceptions, schemas, services
from tests.database import (
    PASSWORD_ACTUAL,
    db_session,
    documentos_de_persona,
    persona_con_password,
    persona_operadora,
)


def test_cambiar_password_guarda_el_hash_de_la_nueva(db_session, persona_con_password):
    datos = schemas.CambioPassword(
        password_actual=PASSWORD_ACTUAL,
        password_nueva="nueva-clave-456",
        confirmacion="nueva-clave-456",
    )

    services.cambiar_password(db_session, persona_con_password, datos)

    assert password_hash.verify("nueva-clave-456", persona_con_password.hashed_password)
    assert not password_hash.verify(PASSWORD_ACTUAL, persona_con_password.hashed_password)


def test_cambiar_password_con_la_actual_incorrecta_lanza_error(db_session, persona_con_password):
    datos = schemas.CambioPassword(
        password_actual="no-es-la-actual",
        password_nueva="nueva-clave-456",
        confirmacion="nueva-clave-456",
    )

    with pytest.raises(exceptions.PasswordActualIncorrecta):
        services.cambiar_password(db_session, persona_con_password, datos)


def test_la_password_nueva_no_puede_ser_igual_a_la_actual(db_session, persona_con_password):
    datos = schemas.CambioPassword(
        password_actual=PASSWORD_ACTUAL,
        password_nueva=PASSWORD_ACTUAL,
        confirmacion=PASSWORD_ACTUAL,
    )

    with pytest.raises(exceptions.PasswordIgualALaActual):
        services.cambiar_password(db_session, persona_con_password, datos)


@pytest.mark.parametrize(
    ("nueva", "confirmacion"),
    [("corta", "corta"), ("nueva-clave-456", "otra-clave-789")],
)
def test_schema_valida_largo_y_confirmacion(nueva, confirmacion):
    with pytest.raises(ValueError):
        schemas.CambioPassword(password_actual=PASSWORD_ACTUAL, password_nueva=nueva, confirmacion=confirmacion)


def test_listar_documentacion_calcula_estado_y_dias(db_session, persona_con_password, documentos_de_persona):
    documentos = services.listar_documentacion(db_session, persona_con_password, hoy=date.today())

    assert [(documento.estado, documento.dias_restantes) for documento in documentos] == [
        ("vencido", -3),
        ("por_vencer", 5),
        ("vigente", 90),
    ]


def test_actualizar_email_duplicado_lanza_error(db_session, persona_con_password, persona_operadora):
    with pytest.raises(exceptions.EmailDuplicado):
        services.actualizar_perfil(db_session, persona_con_password, schemas.PerfilUpdate(email=persona_operadora.email))
