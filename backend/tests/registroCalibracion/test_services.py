from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from src.documentacion.constants import DIAS_AVISO_VENCIMIENTO, EstadoVencimiento
from src.equipos.models import Equipo, TipoEquipo
from src.registroCalibracion import exceptions, schemas, services
from src.registroCalibracion.constants import ErrorCode
from src.registroCalibracion.vencimientos import listar_vencimientos_calibracion


def test_registrar_calibracion_calcula_vencimiento_segun_periodicidad(
    db_session, equipo_con_periodicidad
):
    fecha = date.today() - timedelta(days=10)
    datos = schemas.RegistroCalibracionCreate(
        equipo_id=equipo_con_periodicidad.id,
        fecha_calibracion=fecha,
        otorgado_por="INTI Metrología",
    )

    registro = services.crear_registro(db_session, datos, "/uploads/cert-01.pdf")

    assert registro.id is not None
    assert registro.activo is True
    assert registro.fecha_calibracion == fecha
    assert registro.fecha_vencimiento_calculada == fecha + timedelta(days=90)


def test_sin_periodicidad_no_se_calcula_vencimiento(db_session, equipo_sin_periodicidad):
    fecha = date.today() - timedelta(days=5)
    datos = schemas.RegistroCalibracionCreate(
        equipo_id=equipo_sin_periodicidad.id,
        fecha_calibracion=fecha,
        otorgado_por="Laboratorio externo",
    )

    registro = services.crear_registro(db_session, datos, "/uploads/cert-02.pdf")

    assert registro.fecha_vencimiento_calculada is None


def test_actualiza_fecha_ultima_calibracion_del_equipo(
    db_session, equipo_con_periodicidad
):
    fecha_vieja = date.today() - timedelta(days=40)
    fecha_nueva = date.today() - timedelta(days=5)

    services.crear_registro(
        db_session,
        schemas.RegistroCalibracionCreate(
            equipo_id=equipo_con_periodicidad.id,
            fecha_calibracion=fecha_vieja,
            otorgado_por="INTI",
        ),
        "/uploads/cert-viejo.pdf",
    )
    db_session.refresh(equipo_con_periodicidad)
    assert equipo_con_periodicidad.fecha_ultima_calibracion == fecha_vieja

    services.crear_registro(
        db_session,
        schemas.RegistroCalibracionCreate(
            equipo_id=equipo_con_periodicidad.id,
            fecha_calibracion=fecha_nueva,
            otorgado_por="INTI",
        ),
        "/uploads/cert-nuevo.pdf",
    )
    db_session.refresh(equipo_con_periodicidad)
    assert equipo_con_periodicidad.fecha_ultima_calibracion == fecha_nueva


def test_modificar_calibracion_actualiza_vencimiento_y_ultima_calibracion(
    db_session, equipo_con_periodicidad
):
    fecha_inicial = date.today() - timedelta(days=20)
    fecha_corregida = date.today() - timedelta(days=3)

    registro = services.crear_registro(
        db_session,
        schemas.RegistroCalibracionCreate(
            equipo_id=equipo_con_periodicidad.id,
            fecha_calibracion=fecha_inicial,
            otorgado_por="Laboratorio A",
        ),
        "/uploads/cert-original.pdf",
    )

    modificado = services.modificar_registro(
        db_session,
        registro.id,
        schemas.RegistroCalibracionUpdate(
            fecha_calibracion=fecha_corregida,
            otorgado_por="Laboratorio B",
        ),
        "/uploads/cert-reemplazo.pdf",
    )
    db_session.refresh(equipo_con_periodicidad)

    assert modificado.fecha_calibracion == fecha_corregida
    assert modificado.otorgado_por == "Laboratorio B"
    assert modificado.certificado_path == "/uploads/cert-reemplazo.pdf"
    assert modificado.fecha_vencimiento_calculada == fecha_corregida + timedelta(days=90)
    assert equipo_con_periodicidad.fecha_ultima_calibracion == fecha_corregida


def test_eliminar_calibracion_recalcula_ultima_calibracion_del_equipo(
    db_session, equipo_con_periodicidad
):
    fecha_anterior = date.today() - timedelta(days=60)
    fecha_reciente = date.today() - timedelta(days=2)

    services.crear_registro(
        db_session,
        schemas.RegistroCalibracionCreate(
            equipo_id=equipo_con_periodicidad.id,
            fecha_calibracion=fecha_anterior,
            otorgado_por="INTI",
        ),
        "/uploads/cert-1.pdf",
    )
    reciente = services.crear_registro(
        db_session,
        schemas.RegistroCalibracionCreate(
            equipo_id=equipo_con_periodicidad.id,
            fecha_calibracion=fecha_reciente,
            otorgado_por="INTI",
        ),
        "/uploads/cert-2.pdf",
    )

    db_session.refresh(equipo_con_periodicidad)
    assert equipo_con_periodicidad.fecha_ultima_calibracion == fecha_reciente

    eliminado = services.eliminar_registro(db_session, reciente.id)
    db_session.refresh(equipo_con_periodicidad)

    assert eliminado.activo is False
    assert equipo_con_periodicidad.fecha_ultima_calibracion == fecha_anterior
    with pytest.raises(exceptions.RegistroCalibracionNoEncontrado):
        services.leer_registro(db_session, reciente.id)


def test_error_si_equipo_no_existe_o_esta_inactivo(db_session, equipo_inactivo):
    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.crear_registro(
            db_session,
            schemas.RegistroCalibracionCreate(
                equipo_id=999999,
                fecha_calibracion=date.today(),
                otorgado_por="INTI",
            ),
            "/uploads/cert.pdf",
        )

    with pytest.raises(exceptions.EquipoNoEncontrado):
        services.crear_registro(
            db_session,
            schemas.RegistroCalibracionCreate(
                equipo_id=equipo_inactivo.id,
                fecha_calibracion=date.today(),
                otorgado_por="INTI",
            ),
            "/uploads/cert.pdf",
        )


def test_fecha_calibracion_futura_es_rechazada():
    manana = date.today() + timedelta(days=1)

    with pytest.raises(ValidationError, match=ErrorCode.FECHA_CALIBRACION_FUTURA):
        schemas.RegistroCalibracionCreate(
            equipo_id=1,
            fecha_calibracion=manana,
            otorgado_por="INTI",
        )


def test_listado_vencimientos_con_estado_dias_restantes_filtro_y_busqueda(
    db_session, sector_laboratorio, sector_panaderia
):
    hoy = date(2026, 6, 1)

    eq_vencido = Equipo(
        numero_serie="SER-VENC",
        nombre="Termómetro cámara",
        tipo=TipoEquipo.INSTRUMENTO,
        sector_id=sector_laboratorio.id,
        periodicidad_dias=30,
        fecha_ultima_calibracion=hoy - timedelta(days=35),  # vence hace 5 días
        activo=True,
    )
    eq_por_vencer = Equipo(
        numero_serie="SER-PROX",
        nombre="Balanza panadería",
        tipo=TipoEquipo.EQUIPO,
        sector_id=sector_panaderia.id,
        periodicidad_dias=30,
        fecha_ultima_calibracion=hoy - timedelta(days=30 - DIAS_AVISO_VENCIMIENTO),
        activo=True,
    )
    eq_vigente = Equipo(
        numero_serie="SER-VIG",
        nombre="Sonda horno",
        tipo=TipoEquipo.INSTRUMENTO,
        sector_id=sector_panaderia.id,
        periodicidad_dias=60,
        fecha_ultima_calibracion=hoy - timedelta(days=10),  # faltan 50 días
        activo=True,
    )
    eq_sin_periodicidad = Equipo(
        numero_serie="SER-SIN",
        nombre="Mesada",
        tipo=TipoEquipo.EQUIPO,
        sector_id=sector_laboratorio.id,
        periodicidad_dias=None,
        fecha_ultima_calibracion=hoy,
        activo=True,
    )
    db_session.add_all([eq_vencido, eq_por_vencer, eq_vigente, eq_sin_periodicidad])
    db_session.commit()

    # Todos ordenados por fecha_vencimiento ascendente (excluye sin periodicidad)
    todos = listar_vencimientos_calibracion(db_session, hoy=hoy)
    assert todos["total"] == 3
    assert [
        (item["equipo"].numero_serie, item["estado"], item["dias_restantes"])
        for item in todos["items"]
    ] == [
        ("SER-VENC", EstadoVencimiento.VENCIDO, -5),
        ("SER-PROX", EstadoVencimiento.POR_VENCER, DIAS_AVISO_VENCIMIENTO),
        ("SER-VIG", EstadoVencimiento.VIGENTE, 50),
    ]

    # Filtro por estado
    vencidos = listar_vencimientos_calibracion(
        db_session, estado=EstadoVencimiento.VENCIDO, hoy=hoy
    )
    assert [i["equipo"].numero_serie for i in vencidos["items"]] == ["SER-VENC"]

    por_vencer = listar_vencimientos_calibracion(
        db_session, estado=EstadoVencimiento.POR_VENCER, hoy=hoy
    )
    assert [i["equipo"].numero_serie for i in por_vencer["items"]] == ["SER-PROX"]

    vigentes = listar_vencimientos_calibracion(
        db_session, estado=EstadoVencimiento.VIGENTE, hoy=hoy
    )
    assert [i["equipo"].numero_serie for i in vigentes["items"]] == ["SER-VIG"]

    # Búsqueda por nombre de equipo, número de serie y sector
    assert [
        i["equipo"].numero_serie
        for i in listar_vencimientos_calibracion(db_session, buscar="sonda", hoy=hoy)["items"]
    ] == ["SER-VIG"]
    assert [
        i["equipo"].numero_serie
        for i in listar_vencimientos_calibracion(db_session, buscar="ser-prox", hoy=hoy)["items"]
    ] == ["SER-PROX"]
    assert {
        i["equipo"].numero_serie
        for i in listar_vencimientos_calibracion(db_session, buscar="panadería", hoy=hoy)["items"]
    } == {"SER-PROX", "SER-VIG"}