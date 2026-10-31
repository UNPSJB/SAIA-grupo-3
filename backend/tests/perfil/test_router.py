from src.auth.utils import password_hash
from src.personal.models import Personal
from tests.database import (
    PASSWORD_ACTUAL,
    client,
    db_session,
    documentos_de_persona,
    headers_con_password,
    headers_operadora,
    headers_sin_permisos,
    persona_con_password,
    persona_operadora,
    persona_sin_permisos,
)


def test_ver_mi_perfil_devuelve_mis_datos_y_permisos(client, headers_con_password, persona_con_password):
    respuesta = client.get("/perfil", headers=headers_con_password)

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["id"] == persona_con_password.id
    assert datos["nombre"] == "Lucía"
    assert datos["dni"] == "300"
    assert datos["nroLegajo"] == "L-300"
    assert datos["username"] == "lucia"
    assert datos["operar"] is True
    assert datos["administrar"] is False
    assert "hashed_password" not in datos


def test_usuario_sin_permisos_tambien_ve_su_perfil(client, headers_sin_permisos, persona_sin_permisos):
    respuesta = client.get("/perfil", headers=headers_sin_permisos)

    assert respuesta.status_code == 200
    assert respuesta.json()["id"] == persona_sin_permisos.id


def test_cada_usuario_solo_ve_su_propio_perfil(client, headers_operadora, persona_operadora, persona_con_password):
    respuesta = client.get("/perfil", headers=headers_operadora)

    assert respuesta.json()["id"] == persona_operadora.id
    assert respuesta.json()["id"] != persona_con_password.id
    assert client.get(f"/perfil/{persona_con_password.id}", headers=headers_operadora).status_code == 404


def test_perfil_requiere_iniciar_sesion(client):
    assert client.get("/perfil").status_code == 401
    assert client.get("/perfil/documentacion").status_code == 401
    assert client.put("/perfil/password", json={}).status_code == 401


def test_mi_documentacion_trae_solo_mis_documentos_con_estado(client, headers_con_password, documentos_de_persona):
    respuesta = client.get("/perfil/documentacion", headers=headers_con_password)

    assert respuesta.status_code == 200
    documentos = respuesta.json()
    assert [documento["tipo_documento"]["nombre"] for documento in documentos] == [
        "Apto físico",
        "Carnet de manipulador",
        "Libreta sanitaria",
    ]
    assert [documento["estado"] for documento in documentos] == ["vencido", "por_vencer", "vigente"]
    assert [documento["dias_restantes"] for documento in documentos] == [-3, 5, 90]


def test_cambiar_password_con_la_actual_correcta(client, db_session, headers_con_password, persona_con_password):
    persona_id = persona_con_password.id

    respuesta = client.put(
        "/perfil/password",
        headers=headers_con_password,
        json={"password_actual": PASSWORD_ACTUAL, "password_nueva": "nueva-clave-456", "confirmacion": "nueva-clave-456"},
    )

    assert respuesta.status_code == 204
    guardada = db_session.get(Personal, persona_id)
    assert password_hash.verify("nueva-clave-456", guardada.hashed_password)


def test_cambiar_password_con_la_actual_incorrecta(client, db_session, headers_con_password, persona_con_password):
    persona_id = persona_con_password.id
    hash_anterior = persona_con_password.hashed_password

    respuesta = client.put(
        "/perfil/password",
        headers=headers_con_password,
        json={"password_actual": "no-es-la-actual", "password_nueva": "nueva-clave-456", "confirmacion": "nueva-clave-456"},
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == "La contraseña actual es incorrecta."
    assert db_session.get(Personal, persona_id).hashed_password == hash_anterior


def test_password_nueva_corta_o_sin_confirmar_es_rechazada(client, headers_con_password):
    corta = client.put(
        "/perfil/password",
        headers=headers_con_password,
        json={"password_actual": PASSWORD_ACTUAL, "password_nueva": "corta", "confirmacion": "corta"},
    )
    distinta = client.put(
        "/perfil/password",
        headers=headers_con_password,
        json={"password_actual": PASSWORD_ACTUAL, "password_nueva": "nueva-clave-456", "confirmacion": "otra-clave-789"},
    )

    assert corta.status_code == 422
    assert distinta.status_code == 422


def test_actualizar_mi_email(client, headers_con_password):
    respuesta = client.patch("/perfil", headers=headers_con_password, json={"email": "Lucia.Nueva@Example.com"})

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "lucia.nueva@example.com"


def test_no_puedo_cambiar_mis_permisos_dni_ni_legajo(client, headers_con_password):
    respuesta = client.patch(
        "/perfil",
        headers=headers_con_password,
        json={"email": "lucia@example.com", "administrar": True, "dni": "999", "nroLegajo": "X"},
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["administrar"] is False
    assert datos["dni"] == "300"
    assert datos["nroLegajo"] == "L-300"


def test_email_de_otra_persona_es_rechazado(client, headers_con_password, persona_operadora):
    respuesta = client.patch("/perfil", headers=headers_con_password, json={"email": persona_operadora.email})

    assert respuesta.status_code == 400
