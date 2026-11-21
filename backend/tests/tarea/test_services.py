import pytest
from pydantic import ValidationError

from src.tarea import exceptions, schemas, services
from src.tarea.models import FrecuenciaTarea


def test_crear_tarea_con_elementos_e_insumos_y_cantidades(
    db_session,
    equipo_horno,
    elemento_esponja,
    elemento_cepillo,
    quimico_detergente,
    quimico_desinfectante,
):
    datos = schemas.TareaCreate(
        nombre="Lavado profundo de horno",
        frecuencia=FrecuenciaTarea.DIARIA,
        procedimiento="Lavar con detergente y luego desinfectar.",
        equipo_id=equipo_horno.id,
        elemento_ids=[elemento_esponja.id, elemento_cepillo.id],
        insumos_quimicos=[
            schemas.TareaInsumoQuimicoBase(
                insumo_quimico_id=quimico_detergente.id, cantidad=0.5
            ),
            schemas.TareaInsumoQuimicoBase(
                insumo_quimico_id=quimico_desinfectante.id, cantidad=0.25
            ),
        ],
    )

    tarea = services.crear_tarea(db_session, datos)

    assert tarea.id is not None
    assert tarea.nombre == "Lavado profundo de horno"
    assert tarea.frecuencia == FrecuenciaTarea.DIARIA
    assert tarea.equipo_id == equipo_horno.id
    assert {e.id for e in tarea.elementos} == {elemento_esponja.id, elemento_cepillo.id}
    assert {
        (iq.insumo_quimico_id, iq.cantidad) for iq in tarea.insumos_quimicos
    } == {(quimico_detergente.id, 0.5), (quimico_desinfectante.id, 0.25)}


def test_modificar_tarea_reemplaza_elementos_e_insumos(
    db_session,
    elemento_esponja,
    elemento_cepillo,
    quimico_detergente,
    quimico_desinfectante,
):
    tarea = services.crear_tarea(
        db_session,
        schemas.TareaCreate(
            nombre="Limpieza inicial",
            frecuencia=FrecuenciaTarea.DIARIA,
            procedimiento="Procedimiento original.",
            elemento_ids=[elemento_esponja.id],
            insumos_quimicos=[
                schemas.TareaInsumoQuimicoBase(
                    insumo_quimico_id=quimico_detergente.id, cantidad=1.0
                )
            ],
        ),
    )

    actualizada = services.modificar_tarea(
        db_session,
        tarea.id,
        schemas.TareaUpdate(
            nombre="Limpieza actualizada",
            frecuencia=FrecuenciaTarea.SEMANAL,
            elemento_ids=[elemento_cepillo.id],
            insumos_quimicos=[
                schemas.TareaInsumoQuimicoBase(
                    insumo_quimico_id=quimico_desinfectante.id, cantidad=2.5
                )
            ],
        ),
    )

    assert actualizada.nombre == "Limpieza actualizada"
    assert actualizada.frecuencia == FrecuenciaTarea.SEMANAL
    assert [e.id for e in actualizada.elementos] == [elemento_cepillo.id]
    assert [
        (iq.insumo_quimico_id, iq.cantidad) for iq in actualizada.insumos_quimicos
    ] == [(quimico_desinfectante.id, 2.5)]


@pytest.mark.parametrize("cantidad", [0, 0.0, -1, -0.5])
def test_tarea_cantidad_insumo_menor_o_igual_a_cero_es_rechazada(cantidad):
    with pytest.raises(ValidationError):
        schemas.TareaInsumoQuimicoBase(insumo_quimico_id=1, cantidad=cantidad)


def test_crear_tarea_con_equipo_o_insumo_quimico_inexistente_lanza_error(db_session):
    with pytest.raises(exceptions.EquipoNoExiste):
        services.crear_tarea(
            db_session,
            schemas.TareaCreate(
                nombre="Tarea sin equipo válido",
                frecuencia=FrecuenciaTarea.DIARIA,
                procedimiento="Procedimiento.",
                equipo_id=999999,
            ),
        )

    with pytest.raises(exceptions.InsumosQuimicosNoEncontrados):
        services.crear_tarea(
            db_session,
            schemas.TareaCreate(
                nombre="Tarea sin químico válido",
                frecuencia=FrecuenciaTarea.DIARIA,
                procedimiento="Procedimiento.",
                insumos_quimicos=[
                    schemas.TareaInsumoQuimicoBase(
                        insumo_quimico_id=999999, cantidad=1.0
                    )
                ],
            ),
        )


def test_leer_y_eliminar_tarea(db_session, tarea_limpieza_horno):
    tarea_id = tarea_limpieza_horno.id

    assert services.leer_tarea(db_session, tarea_id).nombre == "Limpieza de horno"

    eliminada = services.eliminar_tarea(db_session, tarea_id)
    assert eliminada.id == tarea_id

    with pytest.raises(exceptions.TareaNoEncontrada):
        services.leer_tarea(db_session, tarea_id)