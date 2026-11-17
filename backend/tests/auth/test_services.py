import pytest

from src.auth import exceptions
from src.auth.service import authenticate_user
from src.auth.utils import check_passwords_match, get_password_hash, password_hash
from tests.auth.conftest import PASSWORD


@pytest.mark.parametrize("identificador", ["martina", "martina@example.com", "40111222"])
def test_autenticar_con_username_email_o_dni_devuelve_el_usuario(db_session, persona_con_login, identificador):
    persona = authenticate_user(identificador, PASSWORD, db_session)

    assert persona.id == persona_con_login.id


def test_autenticar_ignora_mayusculas_y_espacios(db_session, persona_con_login):
    persona = authenticate_user("  MARTINA@Example.com ", PASSWORD, db_session)

    assert persona.id == persona_con_login.id


def test_password_incorrecta_lanza_error(db_session, persona_con_login):
    with pytest.raises(exceptions.IncorrectUserOrPassword):
        authenticate_user("martina", "otra-clave", db_session)


def test_usuario_inexistente_lanza_error(db_session):
    with pytest.raises(exceptions.IncorrectUserOrPassword):
        authenticate_user("nadie", PASSWORD, db_session)


def test_usuario_inactivo_no_puede_autenticarse(db_session, persona_inactiva):
    with pytest.raises(exceptions.IncorrectUserOrPassword):
        authenticate_user("pablo", PASSWORD, db_session)


def test_hash_de_la_password_se_verifica_correctamente():
    hash_generado = get_password_hash(PASSWORD)

    assert hash_generado != PASSWORD
    assert hash_generado != get_password_hash(PASSWORD)
    assert password_hash.verify(PASSWORD, hash_generado)
    assert not password_hash.verify("otra-clave", hash_generado)


def test_check_passwords_match_lanza_error_si_no_coincide():
    hash_generado = get_password_hash(PASSWORD)

    check_passwords_match(PASSWORD, hash_generado)
    with pytest.raises(exceptions.IncorrectUserOrPassword):
        check_passwords_match("otra-clave", hash_generado)
