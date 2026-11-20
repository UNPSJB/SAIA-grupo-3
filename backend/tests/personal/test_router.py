import pytest

from tests.database import (
    client,
    headers_administradora,
    headers_operadora,
    persona_administradora,
    persona_con_password,
    persona_inactiva,
    persona_operadora,
    personas_para_listado,
)


def test_listado_paginado_con_busqueda_y_orden(
    client, headers_administradora, personas_para_listado
):
    # Act
    respuesta = client.get(
        "/personal/",
        headers=headers_administradora,
        params={
            "page": 1,
            "size": 2,
            "buscar": "Listado",
            "ordenar_por": "apellido",
            "orden": "desc",
        },
    )

    # Assert
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["total"] == 3
    assert datos["pages"] == 2
    assert datos["page"] == 1
    assert datos["size"] == 2
    assert [persona["apellido"] for persona in datos["items"]] == ["Zapata", "Molina"]
    assert all("hashed_password" not in persona for persona in datos["items"])

    segunda_pagina = client.get(
        "/personal/",
        headers=headers_administradora,
        params={
            "page": 2,
            "size": 2,
            "buscar": "Listado",
            "ordenar_por": "apellido",
            "orden": "desc",
        },
    )
    assert [persona["apellido"] for persona in segunda_pagina.json()["items"]] == ["Gómez"]


def test_ver_detalle_por_id(client, headers_administradora, persona_con_password):
    # Act
    # Pide persona_administradora (vía headers) y persona_con_password juntas:
    # así se verifica que los fixtures ya conviven sin colisión de DNI.
    respuesta = client.get(f"/personal/{persona_con_password.id}", headers=headers_administradora)

    # Assert
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["id"] == persona_con_password.id
    assert datos["nombre"] == "Lucía"
    assert datos["dni"] == "301"
    assert datos["nroLegajo"] == "L-300"
    assert "hashed_password" not in datos

    inexistente = client.get("/personal/999999", headers=headers_administradora)
    assert inexistente.status_code == 404
    assert inexistente.json()["detail"] == "El personal no fue encontrado."


def test_operario_ve_su_perfil_pero_no_el_de_otra_persona(
    client, headers_operadora, persona_operadora, persona_administradora
):
    # Act
    propio = client.get(f"/personal/{persona_operadora.id}", headers=headers_operadora)
    ajeno = client.get(f"/personal/{persona_administradora.id}", headers=headers_operadora)

    # Assert
    assert propio.status_code == 200
    assert propio.json()["id"] == persona_operadora.id
    assert ajeno.status_code == 403


def test_reactivar_personal_dado_de_baja(client, headers_administradora, persona_inactiva):
    # Act
    respuesta = client.put(
        f"/personal/{persona_inactiva.id}",
        headers=headers_administradora,
        json={"activo": True},
    )

    # Assert
    assert respuesta.status_code == 200
    assert respuesta.json()["activo"] is True
    assert persona_inactiva.activo is True
    assert client.get(f"/personal/{persona_inactiva.id}", headers=headers_administradora).status_code == 200


@pytest.mark.parametrize("email_invalido", ["no-es-un-email", "sin-arroba.example.com"])
def test_email_invalido_devuelve_422(
    client, headers_administradora, persona_operadora, email_invalido
):
    # Arrange
    datos_alta = {
        "nombre": "Nueva",
        "apellido": "Persona",
        "dni": "901",
        "nroLegajo": "L-901",
        "email": email_invalido,
        "username": "nueva_persona",
        "password": "clave-segura-123",
    }

    # Act
    alta = client.post("/personal/", headers=headers_administradora, json=datos_alta)
    edicion = client.put(
        f"/personal/{persona_operadora.id}",
        headers=headers_administradora,
        json={"email": email_invalido},
    )

    # Assert
    assert alta.status_code == 422
    assert edicion.status_code == 422
