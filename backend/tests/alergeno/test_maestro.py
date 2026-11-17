def test_los_datos_iniciales_traen_los_grupos_del_caa(client, headers_administradora, alergenos_caa):
    respuesta = client.get("/alergenos/", headers=headers_administradora)

    assert respuesta.status_code == 200
    nombres = [a["nombre"] for a in respuesta.json()]
    assert nombres[:4] == ["Trigo", "Avena", "Cebada", "Centeno"]
    assert {"Huevo", "Leche", "Soja", "Maní", "Pescado", "Crustáceos", "Sulfitos"} <= set(nombres)
    gluten = {a["nombre"] for a in respuesta.json() if a["implica_gluten"]}
    assert gluten == {"Trigo", "Avena", "Cebada", "Centeno"}
    assert {a["grupo"] for a in respuesta.json() if a["nombre"] in {"Nuez", "Almendra"}} == {"Frutas secas"}


def test_los_datos_iniciales_no_se_duplican(db_session, alergenos_caa):
    from scripts.datos_iniciales_alergenos import cargar_alergenos_iniciales

    assert cargar_alergenos_iniciales(db_session) == 0


def test_alta_modificacion_y_baja(client, headers_administradora, alergenos_caa):
    creado = client.post(
        "/alergenos/",
        headers=headers_administradora,
        json={"nombre": "Kamut", "grupo": "Cereales que contienen gluten", "texto_declaracion": "kamut", "implica_gluten": True},
    )
    assert creado.status_code == 200, creado.text
    alergeno_id = creado.json()["id"]

    duplicado = client.post(
        "/alergenos/",
        headers=headers_administradora,
        json={"nombre": "kamut", "grupo": "Otro", "texto_declaracion": "kamut"},
    )
    assert duplicado.status_code == 400

    modificado = client.put(
        f"/alergenos/{alergeno_id}", headers=headers_administradora, json={"texto_declaracion": "trigo kamut"}
    )
    assert modificado.json()["texto_declaracion"] == "trigo kamut"

    baja = client.delete(f"/alergenos/{alergeno_id}", headers=headers_administradora)
    assert baja.json()["activo"] is False
    activos = {a["nombre"] for a in client.get("/alergenos/", headers=headers_administradora).json()}
    todos = {
        a["nombre"]
        for a in client.get("/alergenos/?mostrar_inactivos=true", headers=headers_administradora).json()
    }
    assert "Kamut" not in activos and "Kamut" in todos


def test_solo_quien_administra_gestiona_el_maestro(client, headers_operadora, alergenos_caa):
    respuesta = client.post(
        "/alergenos/", headers=headers_operadora, json={"nombre": "Lupino", "grupo": "Otros", "texto_declaracion": "lupino"}
    )

    assert respuesta.status_code == 403


def test_el_insumo_guarda_sus_alergenos_y_si_contiene_gluten(
    client, headers_administradora, unidad_medida, alergenos_caa
):
    creado = client.post(
        "/insumos/",
        headers=headers_administradora,
        json={
            "nombre": "Harina de cebada",
            "unidad_medida_id": unidad_medida.id,
            "alergeno_ids": [alergenos_caa["Cebada"].id],
            "contiene_gluten": True,
        },
    )
    assert creado.status_code == 200, creado.text
    assert creado.json()["contiene_gluten"] is True
    assert [a["nombre"] for a in creado.json()["alergenos"]] == ["Cebada"]

    cambiado = client.put(
        f"/insumos/{creado.json()['id']}",
        headers=headers_administradora,
        json={"alergeno_ids": [alergenos_caa["Cebada"].id, alergenos_caa["Soja"].id]},
    )
    assert sorted(a["nombre"] for a in cambiado.json()["alergenos"]) == ["Cebada", "Soja"]


def test_el_insumo_no_acepta_alergenos_inexistentes_o_dados_de_baja(
    client, db_session, headers_administradora, unidad_medida, alergenos_caa
):
    alergenos_caa["Pistacho"].activo = False
    db_session.commit()
    base = {"nombre": "Mix", "unidad_medida_id": unidad_medida.id}

    inexistente = client.post("/insumos/", headers=headers_administradora, json={**base, "alergeno_ids": [9999]})
    de_baja = client.post(
        "/insumos/", headers=headers_administradora, json={**base, "alergeno_ids": [alergenos_caa["Pistacho"].id]}
    )

    assert inexistente.status_code == 400
    assert de_baja.status_code == 400
