from datetime import date, datetime, timedelta
import pytest
from fastapi import HTTPException
from src.incidente import services
from src.incidente.models import Incidente
from src.incidente.constants import EstadoIncidente
from src.tipoIncidente.models import TipoIncidente
from src.incidente import exceptions as incidente_exceptions
from src.incidente import schemas as incidente_schemas
from src.incidente.auditoria import AccionMovimientoIncidente


def test_estadisticas_agrupan_filtran_y_actualizan(db_session, persona_operadora):
    hoy=date.today()
    tipo=TipoIncidente(nombre='Plagas',color='danger',activo=True)
    otro=TipoIncidente(nombre='Roturas',color='info',activo=True)
    db_session.add_all([tipo,otro]);db_session.flush()
    def agregar(tipo, dia):
        db_session.add(Incidente(descripcion='Hallazgo de prueba',tipo_id=tipo.id,reportado_por_dni=persona_operadora.dni,fecha_hora=datetime.combine(dia,datetime.min.time()),estado=EstadoIncidente.ABIERTO));db_session.commit()
    agregar(tipo,hoy);agregar(otro,hoy-timedelta(days=40))
    resultado=services.estadisticas_incidentes(db_session,hoy,hoy)
    assert resultado.total==1
    assert {i.tipo.nombre:i.total for i in resultado.por_tipo}=={'Plagas':1,'Roturas':0}
    agregar(tipo,hoy)
    assert services.estadisticas_incidentes(db_session,hoy,hoy).total==2


def test_estadisticas_rechazan_rango_invertido(db_session):
    with pytest.raises(HTTPException):services.estadisticas_incidentes(db_session,date(2026,2,1),date(2026,1,1))

def test_reportar_incidente_lo_deja_abierto_y_registra_movimiento_reportado(
    db_session, persona_operadora, tipo_plagas
):
    datos = incidente_schemas.IncidenteCreate(
        descripcion="  Se detectó humedad en depósito  ",
        tipo_id=tipo_plagas.id,
    )

    incidente = services.crear_incidente(db_session, datos, persona_operadora.dni)

    assert incidente.id is not None
    assert incidente.descripcion == "Se detectó humedad en depósito"
    assert incidente.estado == EstadoIncidente.ABIERTO
    assert incidente.reportado_por_dni == persona_operadora.dni

    movimientos = services.listar_movimientos(db_session, incidente.id)
    assert len(movimientos) == 1
    assert movimientos[0].accion == AccionMovimientoIncidente.REPORTADO
    assert movimientos[0].personal_id == persona_operadora.id


def test_solo_personal_activo_con_permiso_operar_puede_reportar(
    db_session, persona_sin_permisos, operadora_inactiva, tipo_plagas
):
    datos = incidente_schemas.IncidenteCreate(
        descripcion="Incidente de prueba",
        tipo_id=tipo_plagas.id,
    )

    with pytest.raises(incidente_exceptions.OperadorNoValido):
        services.crear_incidente(db_session, datos, persona_sin_permisos.dni)

    with pytest.raises(incidente_exceptions.OperadorNoValido):
        services.crear_incidente(db_session, datos, operadora_inactiva.dni)

    with pytest.raises(incidente_exceptions.OperadorNoValido):
        services.crear_incidente(db_session, datos, "99999999")


def test_listar_incidentes_filtra_por_estado_y_rango_de_fechas(
    db_session, persona_operadora, tipo_plagas
):
    hoy = date.today()
    hace_10_dias = hoy - timedelta(days=10)
    hace_3_dias = hoy - timedelta(days=3)

    abierto_viejo = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Abierto viejo", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    abierto_viejo.fecha_hora = datetime.combine(hace_10_dias, datetime.min.time())

    cerrado_reciente = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Cerrado reciente", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    cerrado_reciente.fecha_hora = datetime.combine(hace_3_dias, datetime.min.time())
    cerrado_reciente.estado = EstadoIncidente.CERRADO

    abierto_hoy = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Abierto hoy", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    abierto_hoy.fecha_hora = datetime.combine(hoy, datetime.min.time())
    db_session.commit()

    abiertos = services.listar_incidentes(db_session, estado=EstadoIncidente.ABIERTO)
    assert {i.id for i in abiertos["items"]} == {abierto_viejo.id, abierto_hoy.id}

    cerrados = services.listar_incidentes(db_session, estado=EstadoIncidente.CERRADO)
    assert [i.id for i in cerrados["items"]] == [cerrado_reciente.id]

    rango = services.listar_incidentes(
        db_session,
        fecha_desde=hace_3_dias,
        fecha_hasta=hoy,
    )
    assert {i.id for i in rango["items"]} == {cerrado_reciente.id, abierto_hoy.id}

    combinado = services.listar_incidentes(
        db_session,
        estado=EstadoIncidente.ABIERTO,
        fecha_desde=hace_3_dias,
        fecha_hasta=hoy,
    )
    assert [i.id for i in combinado["items"]] == [abierto_hoy.id]


def test_listado_de_abiertos_ordenado_del_mas_antiguo_y_filtro_por_dias_minimos(
    db_session, persona_operadora, tipo_plagas
):
    ahora = datetime.now()

    inc_10 = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Hace 10 días", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    inc_10.fecha_hora = ahora - timedelta(days=10)

    inc_5 = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Hace 5 días", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    inc_5.fecha_hora = ahora - timedelta(days=5)

    inc_1 = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Hace 1 día", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    inc_1.fecha_hora = ahora - timedelta(days=1)

    cerrado = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Cerrado viejo", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    cerrado.fecha_hora = ahora - timedelta(days=20)
    cerrado.estado = EstadoIncidente.CERRADO
    db_session.commit()

    todos_abiertos = services.listar_incidentes_abiertos(db_session)
    assert [i.id for i in todos_abiertos["items"]] == [inc_10.id, inc_5.id, inc_1.id]

    min_4_dias = services.listar_incidentes_abiertos(db_session, dias_minimos=4)
    assert [i.id for i in min_4_dias["items"]] == [inc_10.id, inc_5.id]


def test_conteo_de_abiertos_por_tipo_incluye_tipos_en_cero(
    db_session, persona_operadora, tipo_plagas, tipo_higiene, tipo_sin_uso
):
    services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Plagas abierto", tipo_id=tipo_plagas.id),
        persona_operadora.dni,
    )
    cerrado = services.crear_incidente(
        db_session,
        incidente_schemas.IncidenteCreate(descripcion="Higiene cerrado", tipo_id=tipo_higiene.id),
        persona_operadora.dni,
    )
    cerrado.estado = EstadoIncidente.CERRADO
    db_session.commit()

    conteo = {item.tipo.nombre: item.cantidad for item in services.contar_abiertos_por_tipo(db_session)}

    assert conteo == {"Plagas": 1, "Higiene": 0, "Sin uso": 0}