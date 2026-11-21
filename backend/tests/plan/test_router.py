from src.plan.constants import ErrorCode as PlanErrorCode


def nombres(respuesta):
    return [item["nombre"] for item in respuesta.json()["items"]]


def test_listado_planes_con_busqueda_y_orden(
    client,
    headers_administradora,
    persona_operadora,
    sector_cocina,
    equipo_horno,
    tarea_limpieza_horno,
    tarea_desinfeccion_mesada,
):
    res_z = client.post(
        "/planes/",
        headers=headers_administradora,
        json={
            "nombre": "Zeta - Plan de horno",
            "descripcion": "Limpieza profunda del horno.",
            "responsable_id": persona_operadora.id,
            "equipo_id": equipo_horno.id,
            "tarea_ids": [tarea_limpieza_horno.id],
        },
    )
    assert res_z.status_code == 200, res_z.text

    res_a = client.post(
        "/planes/",
        headers=headers_administradora,
        json={
            "nombre": "Alfa - Plan de cocina",
            "descripcion": "Rutina general del sector.",
            "responsable_id": persona_operadora.id,
            "sector_id": sector_cocina.id,
            "tarea_ids": [tarea_desinfeccion_mesada.id],
        },
    )
    assert res_a.status_code == 200, res_a.text
    plan_a_id = res_a.json()["id"]

    # Orden ascendente y descendente
    asc = client.get(
        "/planes/",
        headers=headers_administradora,
        params={"ordenar_por": "nombre", "orden": "asc"},
    )
    desc = client.get(
        "/planes/",
        headers=headers_administradora,
        params={"ordenar_por": "nombre", "orden": "desc"},
    )
    assert asc.status_code == 200
    assert nombres(asc) == ["Alfa - Plan de cocina", "Zeta - Plan de horno"]
    assert nombres(desc) == ["Zeta - Plan de horno", "Alfa - Plan de cocina"]

    # Búsqueda por nombre y descripción
    assert nombres(
        client.get("/planes/", headers=headers_administradora, params={"buscar": "horno"})
    ) == ["Zeta - Plan de horno"]
    assert nombres(
        client.get("/planes/", headers=headers_administradora, params={"buscar": "rutina"})
    ) == ["Alfa - Plan de cocina"]

    # Baja lógica oculta del listado por defecto y aparece con mostrar_inactivos
    baja = client.delete(f"/planes/{plan_a_id}", headers=headers_administradora)
    assert baja.status_code == 200
    assert baja.json()["activo"] is False
    assert baja.json()["fecha_fin"] is not None

    assert nombres(client.get("/planes/", headers=headers_administradora)) == [
        "Zeta - Plan de horno"
    ]
    assert (
        len(
            client.get(
                "/planes/",
                headers=headers_administradora,
                params={"mostrar_inactivos": True},
            ).json()["items"]
        )
        == 2
    )


def test_ver_detalle_del_plan_con_sus_tareas(
    client,
    headers_administradora,
    persona_operadora,
    sector_cocina,
    tarea_limpieza_horno,
    tarea_desinfeccion_mesada,
):
    creado = client.post(
        "/planes/",
        headers=headers_administradora,
        json={
            "nombre": "POES Integral Cocina",
            "descripcion": "Incluye limpieza de horno y mesada.",
            "responsable_id": persona_operadora.id,
            "sector_id": sector_cocina.id,
            "tarea_ids": [tarea_limpieza_horno.id, tarea_desinfeccion_mesada.id],
        },
    )
    assert creado.status_code == 200, creado.text
    plan_id = creado.json()["id"]

    detalle = client.get(f"/planes/{plan_id}", headers=headers_administradora)
    assert detalle.status_code == 200, detalle.text
    datos = detalle.json()
    assert datos["id"] == plan_id
    assert datos["sector"]["nombre"] == "Cocina"
    assert datos["responsable"]["id"] == persona_operadora.id
    assert {t["id"] for t in datos["tareas"]} == {
        tarea_limpieza_horno.id,
        tarea_desinfeccion_mesada.id,
    }


def test_desvincular_una_tarea_del_plan(
    client,
    headers_administradora,
    persona_operadora,
    sector_cocina,
    tarea_limpieza_horno,
    tarea_desinfeccion_mesada,
):
    creado = client.post(
        "/planes/",
        headers=headers_administradora,
        json={
            "nombre": "POES Desvinculación",
            "descripcion": "Plan con dos tareas.",
            "responsable_id": persona_operadora.id,
            "sector_id": sector_cocina.id,
            "tarea_ids": [tarea_limpieza_horno.id, tarea_desinfeccion_mesada.id],
        },
    )
    assert creado.status_code == 200, creado.text
    plan_id = creado.json()["id"]

    # Desvincular una tarea enviando la lista actualizada
    actualizado = client.put(
        f"/planes/{plan_id}",
        headers=headers_administradora,
        json={"tarea_ids": [tarea_limpieza_horno.id]},
    )
    assert actualizado.status_code == 200, actualizado.text
    assert [t["id"] for t in actualizado.json()["tareas"]] == [tarea_limpieza_horno.id]

    # Confirmar al volver a consultar el detalle
    detalle = client.get(f"/planes/{plan_id}", headers=headers_administradora)
    assert detalle.status_code == 200
    assert [t["id"] for t in detalle.json()["tareas"]] == [tarea_limpieza_horno.id]

    # No permite desvincular la última tarea (debe quedar al menos una)
    sin_tareas = client.put(
        f"/planes/{plan_id}",
        headers=headers_administradora,
        json={"tarea_ids": []},
    )
    assert sin_tareas.status_code == 400
    assert sin_tareas.json()["detail"] == PlanErrorCode.TAREAS_REQUERIDAS


def test_planes_orden_invalido_devuelve_422(client, headers_administradora):
    respuesta = client.get(
        "/planes/",
        headers=headers_administradora,
        params={"ordenar_por": "columna_falsa"},
    )

    assert respuesta.status_code == 422


def test_planes_requiere_autenticacion_y_permiso_administrar(client, headers_operadora):
    assert client.get("/planes/").status_code == 401
    assert client.get("/planes/", headers=headers_operadora).status_code == 403