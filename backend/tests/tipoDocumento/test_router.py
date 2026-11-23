from src.tipoDocumento.constants import ErrorCode


def test_crud_y_listado_tipos_documento(client, headers_administradora):
    creado = client.post(
        "/tipos-documento/",
        headers=headers_administradora,
        json={"nombre": "Carnet de manipulador"},
    )
    assert creado.status_code == 200, creado.text
    tipo_id = creado.json()["id"]

    duplicado = client.post(
        "/tipos-documento/",
        headers=headers_administradora,
        json={"nombre": "CARNET DE MANIPULADOR"},
    )
    assert duplicado.status_code == 400
    assert duplicado.json()["detail"] == ErrorCode.TIPO_DOCUMENTO_DUPLICADO

    detalle = client.get(f"/tipos-documento/{tipo_id}", headers=headers_administradora)
    assert detalle.status_code == 200
    assert detalle.json()["nombre"] == "Carnet de manipulador"

    modificado = client.put(
        f"/tipos-documento/{tipo_id}",
        headers=headers_administradora,
        json={"nombre": "Libreta sanitaria"},
    )
    assert modificado.status_code == 200
    assert modificado.json()["nombre"] == "Libreta sanitaria"

    baja = client.delete(f"/tipos-documento/{tipo_id}", headers=headers_administradora)
    assert baja.status_code == 200
    assert baja.json()["activo"] is False

    assert client.get("/tipos-documento/", headers=headers_administradora).json()["total"] == 0
    assert (
        client.get(
            "/tipos-documento/",
            headers=headers_administradora,
            params={"mostrar_inactivos": True},
        ).json()["total"]
        == 1
    )


def test_tipos_documento_requiere_autenticacion_y_permiso_administrar(
    client, headers_operadora
):
    assert client.get("/tipos-documento/").status_code == 401
    assert client.get("/tipos-documento/", headers=headers_operadora).status_code == 403