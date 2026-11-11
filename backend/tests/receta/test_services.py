import pytest

from src.areas.exceptions import NoEsIngrediente
from src.receta import exceptions, schemas, services
from src.receta.constants import EstadoVersionReceta


def test_crear_receta_guarda_quien_la_creo(db_session, persona_administradora, datos_receta):
    receta = services.crear_receta(db_session, schemas.RecetaCreate(**datos_receta()), persona_administradora)

    version = receta.version_vigente
    assert version.creado_por_id == persona_administradora.id
    assert version.estado == EstadoVersionReceta.VIGENTE
    assert [renglon.orden for renglon in version.renglones] == [1, 2, 3]


def test_nueva_version_copia_todo_y_archiva_la_anterior(db_session, persona_administradora, datos_receta):
    receta = services.crear_receta(db_session, schemas.RecetaCreate(**datos_receta()), persona_administradora)
    anterior = receta.version_vigente
    datos = datos_receta()
    datos.pop("producto_id")

    receta = services.guardar_nueva_version(
        db_session,
        receta.id,
        schemas.NuevaVersion(**datos, version_base_id=anterior.id, motivo="Cambio de proveedor"),
        persona_administradora,
    )

    assert receta.version_vigente.numero == 2
    assert anterior.estado == EstadoVersionReceta.ARCHIVADA
    assert len(receta.version_vigente.renglones) == len(anterior.renglones)
    assert len(receta.version_vigente.pasos) == len(anterior.pasos)


def test_version_base_archivada_es_de_solo_lectura(db_session, persona_administradora, datos_receta):
    receta = services.crear_receta(db_session, schemas.RecetaCreate(**datos_receta()), persona_administradora)
    version_1 = receta.version_vigente.id
    datos = datos_receta()
    datos.pop("producto_id")
    services.guardar_nueva_version(
        db_session, receta.id, schemas.NuevaVersion(**datos, version_base_id=version_1, motivo="v2"), persona_administradora
    )

    with pytest.raises(exceptions.VersionArchivada):
        services.guardar_nueva_version(
            db_session, receta.id, schemas.NuevaVersion(**datos, version_base_id=version_1, motivo="v3"), persona_administradora
        )


def test_rechaza_insumo_quimico(db_session, persona_administradora, datos_receta, quimico_que_no_es_ingrediente, unidad_medida):
    datos = datos_receta()
    datos["renglones"][0]["insumo_id"] = quimico_que_no_es_ingrediente.id

    with pytest.raises(NoEsIngrediente):
        services.crear_receta(db_session, schemas.RecetaCreate(**datos), persona_administradora)


def test_porcion_incompleta_no_es_valida(datos_receta):
    with pytest.raises(ValueError):
        schemas.RecetaCreate(**datos_receta(porcion_unidad_id=None))


def test_equipo_inexistente_en_un_paso(db_session, persona_administradora, datos_receta):
    datos = datos_receta()
    datos["pasos"][0]["equipo_id"] = 999

    with pytest.raises(exceptions.EquipoInvalido):
        services.crear_receta(db_session, schemas.RecetaCreate(**datos), persona_administradora)
