import pytest

from src.auth.constants import ErrorCode
from src.config import settings
from tests.auth.conftest import PASSWORD

COOKIE = settings.REFRESH_TOKEN_COOKIE_NAME


def iniciar_sesion(client, usuario, password=PASSWORD):
    return client.post("/auth/token", data={"username": usuario, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}

#loguin coerrecto devuelve el token y guarda la cooki
def test_login_correcto_devuelve_token_y_guarda_cookie(client, persona_con_login):
    respuesta = iniciar_sesion(client, "martina")

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["access_token"]
    assert datos["user_id"] == persona_con_login.id
    assert COOKIE in respuesta.cookies
    assert "httponly" in respuesta.headers["set-cookie"].lower()
    assert client.cookies.get(COOKIE)


def test_el_token_del_login_sirve_para_endpoints_protegidos(client, persona_con_login):
    token = iniciar_sesion(client, "martina").json()["access_token"]

    respuesta = client.get("/perfil", headers=bearer(token))

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == persona_con_login.id

#login incorrecto devuelve error
@pytest.mark.parametrize(
    "usuario, password",
    [
        ("martina", "clave-incorrecta"),
        ("nadie", PASSWORD),
        ("pablo", PASSWORD),
    ],
)
def test_login_incorrecto_devuelve_error(client, persona_con_login, persona_inactiva, usuario, password):
    respuesta = iniciar_sesion(client, usuario, password)

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.INCORRECT_USER_OR_PASSWORD
    assert COOKIE not in respuesta.cookies

#renueva la sesion con la cookie, devuelve un token nuevo
def test_renovar_sesion_con_la_cookie_devuelve_token_nuevo(client, persona_con_login):
    iniciar_sesion(client, "martina")

    respuesta = client.put("/auth/token")

    assert respuesta.status_code == 200
    assert respuesta.json()["user_id"] == persona_con_login.id
    assert COOKIE in respuesta.cookies
    nuevo_token = respuesta.json()["access_token"]
    assert client.get("/perfil", headers=bearer(nuevo_token)).status_code == 200


def test_renovar_sesion_sin_cookie_devuelve_401(client):
    respuesta = client.put("/auth/token")

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == ErrorCode.REFRESH_TOKEN_NOT_VALID

#cierra la sesion y borra la cookie
def test_cerrar_sesion_borra_la_cookie(client, persona_con_login):
    iniciar_sesion(client, "martina")
    assert client.cookies.get(COOKIE)

    respuesta = client.delete("/auth/token")

    assert respuesta.status_code == 200
    assert "max-age=0" in respuesta.headers["set-cookie"].lower()
    assert client.cookies.get(COOKIE) is None
    assert client.put("/auth/token").status_code == 401

#sin token, los endpoints protegidos devuelven 401
@pytest.mark.parametrize(
    "metodo, ruta",
    [
        ("get", "/perfil"),
        ("get", "/auth/validate-user"),
        ("get", "/personal/"),
        ("get", "/personal/1"),
        ("get", "/insumos/"),
        ("get", "/equipos/"),
    ],
)
def test_sin_token_los_endpoints_protegidos_devuelven_401(client, metodo, ruta):
    respuesta = client.request(metodo, ruta)

    assert respuesta.status_code == 401


def test_token_invalido_devuelve_401(client):
    respuesta = client.get("/perfil", headers=bearer("token-falso"))

    assert respuesta.status_code == 401


def test_token_de_usuario_dado_de_baja_devuelve_401(client, db_session, persona_con_login):
    token = iniciar_sesion(client, "martina").json()["access_token"]
    persona_con_login.activo = False
    db_session.commit()

    respuesta = client.get("/perfil", headers=bearer(token))

    assert respuesta.status_code == 401

#Un operario no puede usar endpoints de administración (parametrizado)
ENDPOINTS_ADMINISTRACION = [
    ("get", "/personal/"),
    ("post", "/personal/"),
    ("put", "/personal/1"),
    ("delete", "/personal/1"),
    ("get", "/insumos/"),
    ("post", "/insumos/"),
    ("get", "/equipos/"),
    ("delete", "/equipos/1"),
]


@pytest.mark.parametrize("metodo, ruta", ENDPOINTS_ADMINISTRACION)
def test_operario_no_puede_usar_endpoints_de_administracion(client, headers_operadora, metodo, ruta):
    respuesta = client.request(metodo, ruta, headers=headers_operadora, json={})

    assert respuesta.status_code == 403
    assert respuesta.json()["detail"] == "Permiso denegado"


def test_administrador_si_puede_usar_endpoints_de_administracion(client, headers_administradora):
    respuesta = client.get("/personal/", headers=headers_administradora)

    assert respuesta.status_code == 200


#Un usuario sin permisos solo puede consultar su propio perfil
def test_usuario_sin_permisos_solo_consulta_su_propio_perfil(
    client, headers_sin_permisos, persona_sin_permisos, persona_operadora
):
    mi_perfil = client.get("/perfil", headers=headers_sin_permisos)
    assert mi_perfil.status_code == 200
    assert mi_perfil.json()["id"] == persona_sin_permisos.id

    assert client.get(f"/personal/{persona_sin_permisos.id}", headers=headers_sin_permisos).status_code == 200
    assert client.get(f"/personal/{persona_operadora.id}", headers=headers_sin_permisos).status_code == 403
    assert client.get("/personal/", headers=headers_sin_permisos).status_code == 403

