def nombres(respuesta):
    return [item["nombre"] for item in respuesta.json()["items"]]


def test_crud_y_listado_tareas_con_busqueda_y_orden(
    client,
    headers_administradora,
    equipo_horno,
    elemento_esponja,
    quimico_detergente,
):
    res_z = client.post(
        "/tareas/",
        headers=headers_administradora,
        json={
            "nombre": "Zonal - Limpieza de horno",
            "frecuencia": "semanal",
            "procedimiento": "Limpiar el interior del horno.",
            "equipo_id": equipo_horno.id,
            "elemento_ids": [elemento_esponja.id],
            "insumos_quimicos": [
                {"insumo_quimico_id": quimico_detergente.id, "cantidad": 0.5}
            ],
        },
    )
    assert res_z.status_code == 200, res_z.text
    tarea_z = res_z.json()

    res_a = client.post(
        "/tareas/",
        headers=headers_administradora,
        json={
            "nombre": "Alfa - Desinfección de mesada",
            "frecuencia": "diaria",
            "procedimiento": "Aplicar sanitizante sobre la superficie.",
            "elemento_ids": [],
            "insumos_quimicos": [],
        },
    )
    assert res_a.status_code == 200, res_a.text
    tarea_a = res_a.json()

    # Orden ascendente y descendente
    asc = client.get(
        "/tareas/",
        headers=headers_administradora,
        params={"ordenar_por": "nombre", "orden": "asc"},
    )
    desc = client.get(
        "/tareas/",
        headers=headers_administradora,
        params={"ordenar_por": "nombre", "orden": "desc"},
    )
    assert asc.status_code == 200
    assert nombres(asc) == ["Alfa - Desinfección de mesada", "Zonal - Limpieza de horno"]
    assert nombres(desc) == ["Zonal - Limpieza de horno", "Alfa - Desinfección de mesada"]

    # Búsqueda por nombre y por procedimiento
    por_nombre = client.get(
        "/tareas/", headers=headers_administradora, params={"buscar": "horno"}
    )
    por_proc = client.get(
        "/tareas/", headers=headers_administradora, params={"buscar": "sanitizante"}
    )
    assert nombres(por_nombre) == ["Zonal - Limpieza de horno"]
    assert nombres(por_proc) == ["Alfa - Desinfección de mesada"]

    # Detalle, modificación y eliminación
    detalle = client.get(f"/tareas/{tarea_z['id']}", headers=headers_administradora)
    assert detalle.status_code == 200
    assert detalle.json()["insumos_quimicos"][0]["cantidad"] == 0.5

    modificada = client.put(
        f"/tareas/{tarea_a['id']}",
        headers=headers_administradora,
        json={"nombre": "Alfa - Mesada actualizada"},
    )
    assert modificada.status_code == 200
    assert modificada.json()["nombre"] == "Alfa - Mesada actualizada"

    assert (
        client.delete(f"/tareas/{tarea_a['id']}", headers=headers_administradora).status_code
        == 200
    )
    assert (
        client.get(f"/tareas/{tarea_a['id']}", headers=headers_administradora).status_code
        == 404
    )


def test_crear_tarea_con_cantidad_invalida_devuelve_422(
    client, headers_administradora, quimico_detergente
):
    respuesta = client.post(
        "/tareas/",
        headers=headers_administradora,
        json={
            "nombre": "Tarea inválida",
            "frecuencia": "diaria",
            "procedimiento": "No debe crearse.",
            "insumos_quimicos": [
                {"insumo_quimico_id": quimico_detergente.id, "cantidad": 0}
            ],
        },
    )

    assert respuesta.status_code == 422


def test_tareas_orden_invalido_devuelve_422(client, headers_administradora):
    respuesta = client.get(
        "/tareas/",
        headers=headers_administradora,
        params={"ordenar_por": "columna_falsa"},
    )

    assert respuesta.status_code == 422


def test_tareas_requiere_autenticacion_y_permiso_administrar(client, headers_operadora):
    assert client.get("/tareas/").status_code == 401
    assert client.get("/tareas/", headers=headers_operadora).status_code == 403