def test_crear_listar_y_dar_de_baja_una_clase(client, headers_administradora):
    creada = client.post(
        "/clases-funcionales/", headers=headers_administradora, json={"nombre": " Aromatizante ", "ins_opcional": True}
    )

    assert creada.status_code == 200, creada.text
    clase = creada.json()
    assert (clase["nombre"], clase["ins_opcional"], clase["activo"]) == ("Aromatizante", True, True)
    assert client.get("/clases-funcionales/", headers=headers_administradora).json()["total"] == 1
    baja = client.delete(f"/clases-funcionales/{clase['id']}", headers=headers_administradora)
    assert baja.json()["activo"] is False
    assert client.get("/clases-funcionales/activas", headers=headers_administradora).json() == []


def test_no_se_repite_el_nombre_de_una_clase(client, headers_administradora):
    client.post("/clases-funcionales/", headers=headers_administradora, json={"nombre": "Conservante"})

    respuesta = client.post("/clases-funcionales/", headers=headers_administradora, json={"nombre": "conservante"})

    assert respuesta.status_code == 400


def test_operario_consulta_pero_no_administra_clases(client, headers_operadora):
    assert client.get("/clases-funcionales/activas", headers=headers_operadora).status_code == 200
    assert client.post("/clases-funcionales/", headers=headers_operadora, json={"nombre": "X"}).status_code == 403
