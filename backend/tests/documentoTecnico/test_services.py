import pytest

from src.documentoTecnico import exceptions, schemas, services
from src.documentoTecnico.models import EstadoDocumento, TipoDocumentoTecnico


def test_crear_documento_genera_version_1_vigente_y_registro_de_vigencia(
    db_session, persona_administradora, datos_archivo_pdf
):
    datos = schemas.DocumentoTecnicoBase(
        nombre="  POES Lavado de manos  ",
        tipo=TipoDocumentoTecnico.PROCEDIMIENTO,
        descripcion="   ",
    )

    doc = services.crear_documento(
        db_session, datos, datos_archivo_pdf("poes_v1.pdf"), persona_administradora
    )

    assert doc.id is not None
    assert doc.nombre == "POES Lavado de manos"
    assert doc.descripcion is None
    assert doc.estado == EstadoDocumento.VIGENTE
    assert len(doc.versiones) == 1

    v1 = doc.version_vigente
    assert v1 is not None
    assert v1.numero == 1
    assert v1.estado == EstadoDocumento.VIGENTE
    assert v1.comentario == "Versión inicial"
    assert v1.subido_por_id == persona_administradora.id

    assert len(doc.cambios_vigencia) == 1
    assert doc.vigencia_actual is not None
    assert doc.vigencia_actual.version_id == v1.id
    assert doc.vigencia_actual.version_anterior_id is None
    assert doc.vigencia_actual.personal_id == persona_administradora.id


def test_subir_nueva_version_la_deja_vigente_y_archiva_la_anterior(
    db_session, persona_administradora, documento_bpm, datos_archivo_pdf
):
    v1_id = documento_bpm.version_vigente.id

    actualizado = services.subir_nueva_version(
        db_session,
        documento_bpm.id,
        datos_archivo_pdf("manual_v2.pdf"),
        "Actualización anual",
        persona_administradora,
    )

    assert len(actualizado.versiones) == 2
    assert actualizado.version_vigente.numero == 2
    assert actualizado.version_vigente.estado == EstadoDocumento.VIGENTE
    assert actualizado.version_vigente.comentario == "Actualización anual"

    version_anterior = next(v for v in actualizado.versiones if v.id == v1_id)
    assert version_anterior.estado == EstadoDocumento.ARCHIVADO

    assert actualizado.vigencia_actual.version_id == actualizado.version_vigente.id
    assert actualizado.vigencia_actual.version_anterior_id == v1_id


def test_marcar_version_anterior_como_vigente(
    db_session, persona_administradora, documento_bpm, datos_archivo_pdf
):
    v1_id = documento_bpm.version_vigente.id
    actualizado = services.subir_nueva_version(
        db_session,
        documento_bpm.id,
        datos_archivo_pdf("manual_v2.pdf"),
        "Versión 2",
        persona_administradora,
    )
    v2_id = actualizado.version_vigente.id

    revertido = services.marcar_version_vigente(
        db_session, documento_bpm.id, v1_id, persona_administradora
    )

    assert revertido.version_vigente.id == v1_id
    estados = {v.id: v.estado for v in revertido.versiones}
    assert estados == {v1_id: EstadoDocumento.VIGENTE, v2_id: EstadoDocumento.ARCHIVADO}
    assert revertido.vigencia_actual.version_id == v1_id
    assert revertido.vigencia_actual.version_anterior_id == v2_id


def test_siempre_hay_una_sola_version_vigente_por_documento(
    db_session, persona_administradora, documento_bpm, datos_archivo_pdf
):
    v1_id = documento_bpm.version_vigente.id

    doc = services.subir_nueva_version(
        db_session, documento_bpm.id, datos_archivo_pdf("v2.pdf"), "v2", persona_administradora
    )
    vigentes = [v for v in doc.versiones if v.estado == EstadoDocumento.VIGENTE]
    assert len(vigentes) == 1 and vigentes[0].numero == 2

    doc = services.subir_nueva_version(
        db_session, documento_bpm.id, datos_archivo_pdf("v3.pdf"), "v3", persona_administradora
    )
    vigentes = [v for v in doc.versiones if v.estado == EstadoDocumento.VIGENTE]
    assert len(vigentes) == 1 and vigentes[0].numero == 3

    doc = services.marcar_version_vigente(
        db_session, documento_bpm.id, v1_id, persona_administradora
    )
    vigentes = [v for v in doc.versiones if v.estado == EstadoDocumento.VIGENTE]
    assert len(vigentes) == 1 and vigentes[0].id == v1_id


def test_no_se_pueden_subir_versiones_a_documento_archivado(
    db_session, persona_administradora, documento_bpm, datos_archivo_pdf
):
    services.cambiar_estado(db_session, documento_bpm.id, EstadoDocumento.ARCHIVADO)

    with pytest.raises(exceptions.DocumentoArchivado):
        services.subir_nueva_version(
            db_session,
            documento_bpm.id,
            datos_archivo_pdf("v2.pdf"),
            "Intento en archivado",
            persona_administradora,
        )

    with pytest.raises(exceptions.DocumentoArchivado):
        services.marcar_version_vigente(
            db_session,
            documento_bpm.id,
            documento_bpm.version_vigente.id,
            persona_administradora,
        )


def test_filtros_por_estado_tipo_y_busqueda(
    db_session, persona_administradora, datos_archivo_pdf
):
    manual = services.crear_documento(
        db_session,
        schemas.DocumentoTecnicoBase(
            nombre="Manual BPM Planta", tipo=TipoDocumentoTecnico.MANUAL_BPM
        ),
        datos_archivo_pdf("bpm.pdf"),
        persona_administradora,
    )
    ficha = services.crear_documento(
        db_session,
        schemas.DocumentoTecnicoBase(
            nombre="Ficha Detergente Alcalino", tipo=TipoDocumentoTecnico.FICHA_TECNICA
        ),
        datos_archivo_pdf("ficha.pdf"),
        persona_administradora,
    )
    receta = services.crear_documento(
        db_session,
        schemas.DocumentoTecnicoBase(
            nombre="Receta Pan Francés", tipo=TipoDocumentoTecnico.RECETA
        ),
        datos_archivo_pdf("receta.pdf"),
        persona_administradora,
    )
    services.cambiar_estado(db_session, receta.id, EstadoDocumento.ARCHIVADO)

    vigentes = services.listar_documentos(db_session, estado=EstadoDocumento.VIGENTE)
    assert {d.id for d in vigentes["items"]} == {manual.id, ficha.id}

    archivados = services.listar_documentos(db_session, estado=EstadoDocumento.ARCHIVADO)
    assert [d.id for d in archivados["items"]] == [receta.id]

    fichas = services.listar_documentos(db_session, tipo=TipoDocumentoTecnico.FICHA_TECNICA)
    assert [d.id for d in fichas["items"]] == [ficha.id]

    busqueda = services.listar_documentos(db_session, busqueda="alcalino")
    assert [d.id for d in busqueda["items"]] == [ficha.id]

    combinado = services.listar_documentos(
        db_session,
        estado=EstadoDocumento.VIGENTE,
        tipo=TipoDocumentoTecnico.MANUAL_BPM,
        busqueda="planta",
    )
    assert [d.id for d in combinado["items"]] == [manual.id]