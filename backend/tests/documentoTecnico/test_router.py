import pytest

from src.documentoTecnico.constants import ErrorCode, TAMANIO_MAXIMO_BYTES


def test_alta_con_archivo_y_rechazo_de_formatos_o_mayor_a_10mb(
    client, headers_administradora, carpeta_documentos_tmp
):
    contenido_pdf = b"%PDF-1.4\nContenido de prueba\n%%EOF"

    # Alta válida con PDF
    creado = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={
            "nombre": "POES Limpieza General",
            "tipo": "procedimiento",
            "descripcion": "Procedimiento estándar",
        },
        files={"archivo": ("poes.pdf", contenido_pdf, "application/pdf")},
    )
    assert creado.status_code == 200, creado.text
    datos = creado.json()
    assert datos["estado"] == "vigente"
    assert datos["version_vigente"]["numero"] == 1
    assert datos["version_vigente"]["nombre_original"] == "poes.pdf"
    assert len(list(carpeta_documentos_tmp.iterdir())) == 1

    # Formato no permitido (.txt / .exe)
    formato_invalido = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "Archivo inválido", "tipo": "procedimiento"},
        files={"archivo": ("notas.txt", b"texto plano", "text/plain")},
    )
    assert formato_invalido.status_code == 400
    assert formato_invalido.json()["detail"] == ErrorCode.ARCHIVO_NO_PERMITIDO

    # Archivo mayor a 10 MB
    archivo_grande = b"x" * (TAMANIO_MAXIMO_BYTES + 1)
    demasiado_grande = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "Archivo gigante", "tipo": "manual_bpm"},
        files={"archivo": ("gigante.pdf", archivo_grande, "application/pdf")},
    )
    assert demasiado_grande.status_code == 400
    assert demasiado_grande.json()["detail"] == ErrorCode.ARCHIVO_DEMASIADO_GRANDE

    # Ninguno de los archivos rechazados quedó guardado en disco
    assert len(list(carpeta_documentos_tmp.iterdir())) == 1


def test_descargar_una_version(client, headers_administradora, carpeta_documentos_tmp):
    contenido = b"%PDF-1.4\nDocumento descargable\n%%EOF"
    creado = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "Ficha Técnica", "tipo": "ficha_tecnica"},
        files={"archivo": ("ficha_v1.pdf", contenido, "application/pdf")},
    )
    assert creado.status_code == 200, creado.text
    version_id = creado.json()["version_vigente"]["id"]

    descarga = client.get(
        f"/documentos-tecnicos/versiones/{version_id}/archivo",
        headers=headers_administradora,
    )
    assert descarga.status_code == 200
    assert descarga.content == contenido
    assert descarga.headers["content-type"] == "application/pdf"
    assert "ficha_v1.pdf" in descarga.headers["content-disposition"]


def test_archivar_y_reactivar_documento(
    client, headers_administradora, carpeta_documentos_tmp
):
    creado = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "Receta Budín", "tipo": "receta"},
        files={"archivo": ("budin.pdf", b"%PDF-1.4\nv1\n%%EOF", "application/pdf")},
    )
    assert creado.status_code == 200, creado.text
    doc_id = creado.json()["id"]

    archivado = client.patch(
        f"/documentos-tecnicos/{doc_id}/archivar",
        headers=headers_administradora,
    )
    assert archivado.status_code == 200
    assert archivado.json()["estado"] == "archivado"

    # Mientras está archivado no permite subir nueva versión
    intento_version = client.post(
        f"/documentos-tecnicos/{doc_id}/versiones",
        headers=headers_administradora,
        files={"archivo": ("budin_v2.pdf", b"%PDF-1.4\nv2\n%%EOF", "application/pdf")},
    )
    assert intento_version.status_code == 400
    assert intento_version.json()["detail"] == ErrorCode.DOCUMENTO_ARCHIVADO

    reactivado = client.patch(
        f"/documentos-tecnicos/{doc_id}/reactivar",
        headers=headers_administradora,
    )
    assert reactivado.status_code == 200
    assert reactivado.json()["estado"] == "vigente"

    # Al reactivarse vuelve a permitir subir versiones
    version_2 = client.post(
        f"/documentos-tecnicos/{doc_id}/versiones",
        headers=headers_administradora,
        data={"comentario": "Versión tras reactivación"},
        files={"archivo": ("budin_v2.pdf", b"%PDF-1.4\nv2\n%%EOF", "application/pdf")},
    )
    assert version_2.status_code == 200, version_2.text
    assert version_2.json()["version_vigente"]["numero"] == 2


def test_operario_puede_consultar_documentos_vigentes_y_su_historial(
    client,
    headers_administradora,
    headers_operadora,
    headers_sin_permisos,
    carpeta_documentos_tmp,
):
    contenido_v1 = b"%PDF-1.4\nVersion 1\n%%EOF"
    contenido_v2 = b"%PDF-1.4\nVersion 2\n%%EOF"

    creado = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "Manual de Higiene", "tipo": "manual_bpm"},
        files={"archivo": ("higiene_v1.pdf", contenido_v1, "application/pdf")},
    )
    assert creado.status_code == 200, creado.text
    doc_id = creado.json()["id"]
    v1_id = creado.json()["version_vigente"]["id"]

    actualizado = client.post(
        f"/documentos-tecnicos/{doc_id}/versiones",
        headers=headers_administradora,
        data={"comentario": "Revisión 2026"},
        files={"archivo": ("higiene_v2.pdf", contenido_v2, "application/pdf")},
    )
    assert actualizado.status_code == 200, actualizado.text
    v2_id = actualizado.json()["version_vigente"]["id"]

    # El operario no puede administrar documentos técnicos
    assert client.get("/documentos-tecnicos/", headers=headers_operadora).status_code == 403
    # Un usuario sin permiso de operar no puede consultar vigentes
    assert client.get("/documentos-vigentes/", headers=headers_sin_permisos).status_code == 403

    # El operario lista documentos vigentes
    listado = client.get("/documentos-vigentes/", headers=headers_operadora)
    assert listado.status_code == 200, listado.text
    assert listado.json()["total"] == 1
    item = listado.json()["items"][0]
    assert item["id"] == doc_id
    assert item["version_vigente"]["id"] == v2_id
    assert item["version_vigente"]["numero"] == 2

    # El operario descarga el archivo vigente (versión 2)
    archivo_vigente = client.get(
        f"/documentos-vigentes/{doc_id}/archivo", headers=headers_operadora
    )
    assert archivo_vigente.status_code == 200
    assert archivo_vigente.content == contenido_v2
    assert archivo_vigente.headers["x-version-numero"] == "2"

    # El operario consulta el historial completo y descarga la versión histórica (versión 1)
    historial = client.get(
        f"/documentos-vigentes/{doc_id}/historial", headers=headers_operadora
    )
    assert historial.status_code == 200, historial.text
    assert [(v["numero"], v["estado"]) for v in historial.json()] == [
        (2, "vigente"),
        (1, "archivado"),
    ]

    archivo_v1 = client.get(
        f"/documentos-vigentes/{doc_id}/historial/{v1_id}/archivo",
        headers=headers_operadora,
    )
    assert archivo_v1.status_code == 200
    assert archivo_v1.content == contenido_v1
    assert archivo_v1.headers["x-version-estado"] == "archivado"


def test_documento_archivado_no_aparece_en_consulta_de_vigentes(
    client, headers_administradora, headers_operadora, carpeta_documentos_tmp
):
    vigente = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "POES Vigente", "tipo": "procedimiento"},
        files={"archivo": ("vigente.pdf", b"%PDF-1.4\nok\n%%EOF", "application/pdf")},
    ).json()

    archivado = client.post(
        "/documentos-tecnicos/",
        headers=headers_administradora,
        data={"nombre": "POES Discontinuado", "tipo": "procedimiento"},
        files={"archivo": ("viejo.pdf", b"%PDF-1.4\nviejo\n%%EOF", "application/pdf")},
    ).json()

    client.patch(
        f"/documentos-tecnicos/{archivado['id']}/archivar",
        headers=headers_administradora,
    )

    listado = client.get("/documentos-vigentes/", headers=headers_operadora)
    assert listado.status_code == 200
    assert [d["id"] for d in listado.json()["items"]] == [vigente["id"]]

    assert (
        client.get(
            f"/documentos-vigentes/{archivado['id']}/archivo", headers=headers_operadora
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/documentos-vigentes/{archivado['id']}/historial", headers=headers_operadora
        ).status_code
        == 404
    )