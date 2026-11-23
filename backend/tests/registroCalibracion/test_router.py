from datetime import date, timedelta
from pathlib import Path

import pytest

from src.archivos import services as archivos_services
from src.registroCalibracion.constants import ErrorCode


@pytest.mark.parametrize(
    ("nombre_archivo", "contenido", "content_type", "extension"),
    [
        ("certificado.pdf", b"%PDF-1.4\n%%EOF", "application/pdf", ".pdf"),
        ("certificado.png", b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
        ("certificado.jpg", b"\xff\xd8\xff\xe0", "image/jpeg", ".jpg"),
    ],
)
def test_registrar_calibracion_con_certificado_pdf_o_imagen(
    client,
    headers_administradora,
    equipo_con_periodicidad,
    tmp_path,
    monkeypatch,
    nombre_archivo,
    contenido,
    content_type,
    extension,
):
    monkeypatch.setattr(archivos_services, "UPLOADS_DIR", tmp_path)
    fecha = (date.today() - timedelta(days=1)).isoformat()

    respuesta = client.post(
        "/calibraciones/",
        headers=headers_administradora,
        data={
            "equipo_id": str(equipo_con_periodicidad.id),
            "fecha_calibracion": fecha,
            "otorgado_por": "INTI Metrología",
        },
        files={"certificado": (nombre_archivo, contenido, content_type)},
    )

    assert respuesta.status_code == 200, respuesta.text
    datos = respuesta.json()
    assert datos["equipo_id"] == equipo_con_periodicidad.id
    assert datos["certificado_path"].endswith(extension)
    assert (tmp_path / Path(datos["certificado_path"]).name).is_file()


def test_registrar_sin_certificado_devuelve_error(
    client, headers_administradora, equipo_con_periodicidad
):
    respuesta = client.post(
        "/calibraciones/",
        headers=headers_administradora,
        data={
            "equipo_id": str(equipo_con_periodicidad.id),
            "fecha_calibracion": date.today().isoformat(),
            "otorgado_por": "INTI Metrología",
        },
    )

    assert respuesta.status_code == 400
    assert respuesta.json()["detail"] == ErrorCode.CERTIFICADO_REQUERIDO


@pytest.mark.parametrize(
    ("nombre_archivo", "content_type"),
    [
        ("archivo.txt", "text/plain"),
        ("planilla.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ("script.exe", "application/octet-stream"),
    ],
)
def test_formato_de_archivo_no_permitido_es_rechazado(
    client,
    headers_administradora,
    equipo_con_periodicidad,
    tmp_path,
    monkeypatch,
    nombre_archivo,
    content_type,
):
    monkeypatch.setattr(archivos_services, "UPLOADS_DIR", tmp_path)

    respuesta = client.post(
        "/calibraciones/",
        headers=headers_administradora,
        data={
            "equipo_id": str(equipo_con_periodicidad.id),
            "fecha_calibracion": date.today().isoformat(),
            "otorgado_por": "INTI Metrología",
        },
        files={"certificado": (nombre_archivo, b"contenido invalido", content_type)},
    )

    assert respuesta.status_code == 400
    assert list(tmp_path.iterdir()) == []


def test_al_reemplazar_certificado_se_borra_el_anterior(
    client, headers_administradora, equipo_con_periodicidad, tmp_path, monkeypatch
):
    monkeypatch.setattr(archivos_services, "UPLOADS_DIR", tmp_path)
    fecha = (date.today() - timedelta(days=5)).isoformat()

    creado = client.post(
        "/calibraciones/",
        headers=headers_administradora,
        data={
            "equipo_id": str(equipo_con_periodicidad.id),
            "fecha_calibracion": fecha,
            "otorgado_por": "Laboratorio inicial",
        },
        files={"certificado": ("inicial.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
    )
    assert creado.status_code == 200, creado.text
    registro_id = creado.json()["id"]
    archivo_anterior = tmp_path / Path(creado.json()["certificado_path"]).name
    assert archivo_anterior.is_file()

    actualizado = client.put(
        f"/calibraciones/{registro_id}",
        headers=headers_administradora,
        data={
            "fecha_calibracion": date.today().isoformat(),
            "otorgado_por": "Laboratorio corregido",
        },
        files={"certificado": ("nuevo.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert actualizado.status_code == 200, actualizado.text
    archivo_nuevo = tmp_path / Path(actualizado.json()["certificado_path"]).name

    assert not archivo_anterior.exists()
    assert archivo_nuevo.is_file()
    assert len(list(tmp_path.iterdir())) == 1


def test_endpoint_vencimientos_y_permisos(
    client,
    headers_administradora,
    headers_operadora,
    equipo_con_periodicidad,
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(archivos_services, "UPLOADS_DIR", tmp_path)

    client.post(
        "/calibraciones/",
        headers=headers_administradora,
        data={
            "equipo_id": str(equipo_con_periodicidad.id),
            "fecha_calibracion": date.today().isoformat(),
            "otorgado_por": "INTI",
        },
        files={"certificado": ("cert.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")},
    )

    assert client.get("/calibraciones/vencimientos").status_code == 401
    assert (
        client.get("/calibraciones/vencimientos", headers=headers_operadora).status_code
        == 403
    )

    vencimientos = client.get(
        "/calibraciones/vencimientos",
        headers=headers_administradora,
        params={"buscar": "Balanza"},
    )
    assert vencimientos.status_code == 200, vencimientos.text
    assert vencimientos.json()["total"] == 1
    assert vencimientos.json()["items"][0]["equipo"]["id"] == equipo_con_periodicidad.id