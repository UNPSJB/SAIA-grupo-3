from src.planRealizado.constants import ErrorCode as PlanErrorCode
from src.tareaRealizada.constants import ErrorCode as TareaErrorCode
from tests.planRealizado.conftest import el_dia


def nombres(respuesta):
    return [item["nombre"] for item in respuesta.json()["items"]]


def registrar(client, headers, datos):
    respuesta = client.post("/planes-realizados/", headers=headers, json=datos)
    assert respuesta.status_code == 200, respuesta.text
    return respuesta.json()


def test_listado_paginado_con_busqueda_y_orden(client, headers_administradora, datos_plan):
    registrar(client, headers_administradora, datos_plan(nombre="Zeta - Horno", descripcion="Limpieza profunda."))
    registrar(client, headers_administradora, datos_plan(nombre="Alfa - Cocina", descripcion="Rutina general."))
    registrar(client, headers_administradora, datos_plan(nombre="Medio - Depósito", descripcion="Limpieza del depósito."))

    pagina_1 = client.get(
        "/planes-realizados/?page=1&size=2&ordenar_por=nombre&orden=asc", headers=headers_administradora
    )
    pagina_2 = client.get(
        "/planes-realizados/?page=2&size=2&ordenar_por=nombre&orden=asc", headers=headers_administradora
    )
    descendente = client.get("/planes-realizados/?ordenar_por=nombre&orden=desc", headers=headers_administradora)
    por_nombre = client.get("/planes-realizados/?buscar=cocina", headers=headers_administradora)
    por_descripcion = client.get("/planes-realizados/?buscar=profunda", headers=headers_administradora)

    assert pagina_1.status_code == 200, pagina_1.text
    assert nombres(pagina_1) == ["Alfa - Cocina", "Medio - Depósito"]
    assert pagina_1.json()["total"] == 3 and pagina_1.json()["pages"] == 2
    assert nombres(pagina_2) == ["Zeta - Horno"]
    assert nombres(descendente) == ["Zeta - Horno", "Medio - Depósito", "Alfa - Cocina"]
    assert nombres(por_nombre) == ["Alfa - Cocina"]
    assert nombres(por_descripcion) == ["Zeta - Horno"]


def test_listado_filtra_por_rango_de_fechas(client, headers_administradora, plan_realizado):
    plan_realizado(nombre="Antes", fecha=el_dia(2026, 10, 15))
    plan_realizado(nombre="Dentro", fecha=el_dia(2026, 11, 15))

    respuesta = client.get(
        "/planes-realizados/?desde=2026-11-01&hasta=2026-11-30", headers=headers_administradora
    )

    assert respuesta.status_code == 200, respuesta.text
    assert nombres(respuesta) == ["Dentro"]


def test_rango_de_fechas_invalido_devuelve_400(client, headers_administradora):
    respuesta = client.get(
        "/planes-realizados/?desde=2026-11-30&hasta=2026-11-01", headers=headers_administradora
    )

    assert respuesta.status_code == 400
    assert "desde" in respuesta.json()["detail"]


def test_ver_detalle_de_un_plan_realizado_con_sus_tareas(
    client, headers_administradora, datos_plan, persona_operadora, tarea_limpieza_horno, tarea_desinfeccion_mesada
):
    creado = registrar(client, headers_administradora, datos_plan())

    respuesta = client.get(f"/planes-realizados/{creado['id']}", headers=headers_administradora)

    assert respuesta.status_code == 200, respuesta.text
    detalle = respuesta.json()
    assert detalle["nombre"] == "POES Cocina"
    assert detalle["responsable"]["id"] == persona_operadora.id
    assert detalle["fecha_ejecucion"]
    tareas = {t["tarea_origen_id"]: t for t in detalle["tareas_realizadas"]}
    assert set(tareas) == {tarea_limpieza_horno.id, tarea_desinfeccion_mesada.id}
    assert tareas[tarea_limpieza_horno.id]["frecuencia"] == "diaria"
    assert tareas[tarea_limpieza_horno.id]["insumos_utilizados"] == [
        {"id": 2, "nombre": "Desengrasante", "cantidad": 0.5}
    ]
    assert all(t["plan_realizado_id"] == creado["id"] for t in detalle["tareas_realizadas"])


def test_detalle_de_un_plan_realizado_inexistente_devuelve_404(client, headers_administradora):
    respuesta = client.get("/planes-realizados/999999", headers=headers_administradora)

    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == PlanErrorCode.PLAN_REALIZADO_NO_ENCONTRADO


def test_listado_y_detalle_de_tareas_realizadas(client, headers_administradora, datos_plan):
    primero = registrar(client, headers_administradora, datos_plan(nombre="Primero"))
    registrar(client, headers_administradora, datos_plan(nombre="Segundo"))

    listado = client.get("/tareas-realizadas/?page=1&size=3", headers=headers_administradora)
    tarea_id = primero["tareas_realizadas"][0]["id"]
    detalle = client.get(f"/tareas-realizadas/{tarea_id}", headers=headers_administradora)
    inexistente = client.get("/tareas-realizadas/999999", headers=headers_administradora)

    assert listado.status_code == 200, listado.text
    assert listado.json()["total"] == 4
    assert listado.json()["pages"] == 2
    assert len(listado.json()["items"]) == 3
    assert detalle.status_code == 200, detalle.text
    assert detalle.json()["id"] == tarea_id
    assert detalle.json()["plan_realizado_id"] == primero["id"]
    assert detalle.json()["nombre"] == primero["tareas_realizadas"][0]["nombre"]
    assert inexistente.status_code == 404
    assert inexistente.json()["detail"] == TareaErrorCode.TAREA_REALIZADA_NO_ENCONTRADA


def test_eliminar_un_plan_realizado_por_la_api_borra_sus_tareas(client, headers_administradora, datos_plan):
    creado = registrar(client, headers_administradora, datos_plan())
    tarea_id = creado["tareas_realizadas"][0]["id"]

    borrado = client.delete(f"/planes-realizados/{creado['id']}", headers=headers_administradora)

    assert borrado.status_code == 200, borrado.text
    assert client.get(f"/planes-realizados/{creado['id']}", headers=headers_administradora).status_code == 404
    assert client.get(f"/tareas-realizadas/{tarea_id}", headers=headers_administradora).status_code == 404


def test_solo_quien_administra_consulta_el_historial(client, headers_operadora):
    assert client.get("/planes-realizados/", headers=headers_operadora).status_code == 403
    assert client.get("/tareas-realizadas/", headers=headers_operadora).status_code == 403
