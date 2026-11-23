import json
from datetime import date

import pytest
from sqlalchemy import select

from src.archivos import services as archivos
from src.auth.utils import create_access_token
from src.checklist.models import EstadoItem
from src.notificaciones.models import Notificacion
from src.personal.models import Personal
from src.plan.models import Plan
from src.tarea.models import FrecuenciaTarea, Tarea


@pytest.fixture
def headers_otra_operadora(db_session):
    persona = Personal(
        nombre="Otra",
        apellido="Operadora",
        dni="450",
        nroLegajo="L-450",
        email="otra.checklist@example.com",
        username="otra_checklist",
        hashed_password="unused",
        operar=True,
        administrar=False,
        activo=True,
    )
    db_session.add(persona)
    db_session.commit()
    return {"Authorization": f"Bearer {create_access_token(persona)}"}


def test_operario_consulta_su_propio_checklist(client, db_session, persona_operadora, headers_operadora):
    tarea = Tarea(
        nombre="Sanitizar mesada",
        frecuencia=FrecuenciaTarea.DIARIA,
        procedimiento="Aplicar alcohol al 70%",
    )
    plan = Plan(
        nombre="POES Cocina",
        descripcion="Limpieza de cocina",
        responsable_id=persona_operadora.id,
        fecha_inicio=date.today(),
        activo=True,
        tareas=[tarea],
    )
    db_session.add(plan)
    db_session.commit()

    respuesta = client.get(f"/checklist/{persona_operadora.id}", headers=headers_operadora)

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos["responsable"]["id"] == persona_operadora.id
    assert datos["total"] == 1
    assert datos["pendientes"] == 1
    assert datos["realizadas"] == 0
    assert datos["items"][0]["tarea"]["nombre"] == "Sanitizar mesada"


def test_operario_no_puede_ver_ni_finalizar_checklist_de_otra_persona(
    client, db_session, persona_operadora, item_checklist, headers_otra_operadora
):
    item, q = item_checklist
    datos = {"consumos": [{"insumo_quimico_id": q.id, "cantidad_utilizada": 5}]}

    consulta = client.get(f"/checklist/{persona_operadora.id}", headers=headers_otra_operadora)
    finalizacion = client.post(
        f"/checklist/items/{item.id}/finalizar",
        data={"consumos_json": json.dumps(datos)},
        headers=headers_otra_operadora,
    )

    assert consulta.status_code == 403
    assert finalizacion.status_code == 403
    db_session.refresh(item)
    db_session.refresh(q)
    assert item.estado == EstadoItem.PENDIENTE
    assert q.cantidad == 10


def test_finalizar_con_foto_guarda_el_archivo(
    client, db_session, item_checklist, headers_operadora, tmp_path, monkeypatch
):
    monkeypatch.setattr(archivos, "UPLOADS_DIR", tmp_path)
    item, q = item_checklist
    datos = {"consumos": [{"insumo_quimico_id": q.id, "cantidad_utilizada": 5}]}

    respuesta = client.post(
        f"/checklist/items/{item.id}/finalizar",
        data={"consumos_json": json.dumps(datos)},
        files={"foto": ("evidencia.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        headers=headers_operadora,
    )

    assert respuesta.status_code == 200, respuesta.text
    foto_path = respuesta.json()["foto_path"]
    assert foto_path is not None
    assert foto_path.startswith("/uploads/")
    assert foto_path.endswith(".png")
    archivos_guardados = list(tmp_path.iterdir())
    assert len(archivos_guardados) == 1
    assert foto_path.endswith(archivos_guardados[0].name)


def test_finalizar_con_archivo_que_no_es_imagen_es_rechazado(
    client, db_session, item_checklist, headers_operadora, tmp_path, monkeypatch
):
    monkeypatch.setattr(archivos, "UPLOADS_DIR", tmp_path)
    item, q = item_checklist
    datos = {"consumos": [{"insumo_quimico_id": q.id, "cantidad_utilizada": 5}]}

    respuesta = client.post(
        f"/checklist/items/{item.id}/finalizar",
        data={"consumos_json": json.dumps(datos)},
        files={"foto": ("documento.pdf", b"%PDF-1.4", "application/pdf")},
        headers=headers_operadora,
    )

    assert respuesta.status_code == 400
    assert "Formato de archivo no permitido" in respuesta.json()["detail"]
    db_session.refresh(item)
    db_session.refresh(q)
    assert item.estado == EstadoItem.PENDIENTE
    assert q.cantidad == 10
    assert list(tmp_path.iterdir()) == []


def test_finalizar_tarea_genera_aviso_y_guarda_actor(client, db_session, item_checklist, headers_operadora):
    item, q = item_checklist
    datos = {"consumos": [{"insumo_quimico_id": q.id, "cantidad_utilizada": 5}]}
    respuesta = client.post(
        f"/checklist/items/{item.id}/finalizar",
        data={"consumos_json": json.dumps(datos)},
        headers=headers_operadora,
    )
    assert respuesta.status_code == 200, respuesta.text
    db_session.refresh(q)
    db_session.refresh(item)
    assert q.cantidad == 5 and item.realizada_por_id == item.responsable_id
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave == f"stock-bajo-quimico-{q.id}")) is not None


def test_finalizar_sin_permiso_no_descontar(client, db_session, item_checklist, headers_sin_permisos):
    item, q = item_checklist
    respuesta = client.post(f"/checklist/items/{item.id}/finalizar", headers=headers_sin_permisos)
    assert respuesta.status_code == 403
    db_session.refresh(q)
    assert q.cantidad == 10