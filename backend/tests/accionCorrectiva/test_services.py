from datetime import datetime

import pytest

from src.accionCorrectiva import exceptions, schemas, services
from src.incidente import services as incidente_services
from src.incidente.auditoria import AccionMovimientoIncidente
from src.incidente.constants import EstadoIncidente


def test_registrar_accion_correctiva_cierra_incidente_y_guarda_responsable_y_fecha(
    db_session, incidente_abierto, persona_administradora
):
    antes = datetime.now()

    accion = services.cerrar_incidente(
        db_session,
        incidente_abierto.id,
        schemas.AccionCorrectivaCreate(descripcion="Se sanitizó la mesada y se verificó."),
        persona_administradora,
    )

    despues = datetime.now()
    db_session.refresh(incidente_abierto)

    assert accion.id is not None
    assert accion.incidente_id == incidente_abierto.id
    assert accion.descripcion == "Se sanitizó la mesada y se verificó."
    assert accion.responsable_id == persona_administradora.id
    assert antes <= accion.fecha_cierre <= despues
    assert accion.vigente is True
    assert incidente_abierto.estado == EstadoIncidente.CERRADO

    movimientos = incidente_services.listar_movimientos(db_session, incidente_abierto.id)
    assert [m.accion for m in movimientos] == [
        AccionMovimientoIncidente.REPORTADO,
        AccionMovimientoIncidente.CERRADO,
    ]
    assert movimientos[-1].motivo == "Se sanitizó la mesada y se verificó."


def test_no_se_puede_cerrar_un_incidente_ya_cerrado(
    db_session, incidente_abierto, persona_administradora
):
    services.cerrar_incidente(
        db_session,
        incidente_abierto.id,
        schemas.AccionCorrectivaCreate(descripcion="Primer cierre"),
        persona_administradora,
    )

    with pytest.raises(exceptions.IncidenteYaCerrado):
        services.cerrar_incidente(
            db_session,
            incidente_abierto.id,
            schemas.AccionCorrectivaCreate(descripcion="Segundo cierre"),
            persona_administradora,
        )


def test_reabrir_deja_accion_anterior_no_vigente_y_registra_motivo(
    db_session, incidente_abierto, persona_administradora
):
    accion = services.cerrar_incidente(
        db_session,
        incidente_abierto.id,
        schemas.AccionCorrectivaCreate(descripcion="Cierre inicial"),
        persona_administradora,
    )

    reabierto = services.reabrir_incidente(
        db_session,
        incidente_abierto.id,
        schemas.ReaperturaIncidente(motivo="El problema volvió a aparecer en el turno tarde"),
        persona_administradora,
    )

    db_session.refresh(accion)
    assert reabierto.estado == EstadoIncidente.ABIERTO
    assert accion.vigente is False

    movimientos = incidente_services.listar_movimientos(db_session, incidente_abierto.id)
    assert [m.accion for m in movimientos] == [
        AccionMovimientoIncidente.REPORTADO,
        AccionMovimientoIncidente.CERRADO,
        AccionMovimientoIncidente.REABIERTO,
    ]
    assert movimientos[-1].motivo == "El problema volvió a aparecer en el turno tarde"


def test_no_se_puede_reabrir_un_incidente_que_no_esta_cerrado(
    db_session, incidente_abierto, persona_administradora
):
    with pytest.raises(exceptions.IncidenteNoCerrado):
        services.reabrir_incidente(
            db_session,
            incidente_abierto.id,
            schemas.ReaperturaIncidente(motivo="Intento inválido"),
            persona_administradora,
        )


def test_solo_se_puede_modificar_la_accion_correctiva_vigente(
    db_session, incidente_abierto, persona_administradora
):
    primera = services.cerrar_incidente(
        db_session,
        incidente_abierto.id,
        schemas.AccionCorrectivaCreate(descripcion="Primera acción"),
        persona_administradora,
    )
    services.reabrir_incidente(
        db_session,
        incidente_abierto.id,
        schemas.ReaperturaIncidente(motivo="Se requiere nueva verificación"),
        persona_administradora,
    )
    segunda = services.cerrar_incidente(
        db_session,
        incidente_abierto.id,
        schemas.AccionCorrectivaCreate(descripcion="Segunda acción"),
        persona_administradora,
    )

    # La primera (no vigente) no se puede modificar
    with pytest.raises(exceptions.AccionNoVigente):
        services.modificar_accion(
            db_session,
            primera.id,
            schemas.AccionCorrectivaUpdate(descripcion="Intento modificar histórica"),
        )

    # La segunda (vigente) sí se puede modificar
    actualizada = services.modificar_accion(
        db_session,
        segunda.id,
        schemas.AccionCorrectivaUpdate(descripcion="Segunda acción corregida"),
    )
    assert actualizada.descripcion == "Segunda acción corregida"