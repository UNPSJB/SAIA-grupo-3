from datetime import date, datetime, time, timedelta
from uuid import uuid4

import pytest

from src.abastecimiento.models import ConsumoLoteRecepcion, ConsumoStockAnterior, LoteRecepcionInsumo
from src.equipos.models import Equipo, TipoEquipo
from src.incidente.models import Incidente
from src.loteProduccion.codigo_barras import generar_codigo_barras
from src.loteProduccion.constants import EstadoLote, TipoAlerta
from src.loteProduccion.models import LoteInsumo, LoteProduccion
from src.produccionDelDia.constants import AccionPasoLote, EstadoPasoLote
from src.produccionDelDia.models import MovimientoPasoLote, PasoLote
from src.registroCalibracion.models import RegistroCalibracion
from src.registroTemperatura.models import RegistroTemperatura
from src.sector.models import Sector
from src.tipoIncidente.models import TipoIncidente

FECHA = date.today() - timedelta(days=2)


def a_las(fecha, hora):
    return datetime.combine(fecha, time(hora, 0))


def crear_lote(db_session, producto, persona, **valores):
    lote = LoteProduccion(
        codigo=f"L-EXP-{uuid4().hex[:6]}",
        codigo_barras=generar_codigo_barras(FECHA, 9500 + db_session.query(LoteProduccion).count()),
        producto_id=producto.id,
        fecha_produccion=FECHA,
        cantidad=120,
        registrado_por_id=persona.id,
        activo=True,
        **valores,
    )
    db_session.add(lote)
    db_session.flush()
    return lote


def crear_equipo(db_session, sector, nombre, periodicidad_dias=None):
    equipo = Equipo(
        numero_serie=f"EXP-{nombre}",
        nombre=nombre,
        tipo=TipoEquipo.EQUIPO,
        sector_id=sector.id,
        activo=True,
        periodicidad_dias=periodicidad_dias,
    )
    db_session.add(equipo)
    db_session.flush()
    return equipo


def calibrar(db_session, equipo, desde, hasta):
    db_session.add(RegistroCalibracion(
        equipo_id=equipo.id,
        fecha_calibracion=desde,
        fecha_vencimiento_calculada=hasta,
        certificado_path="certificado.pdf",
        otorgado_por="Laboratorio de pruebas",
        activo=True,
    ))


def recibir(db_session, insumo, proveedor, persona, numero_lote, recepcion, vencimiento):
    lote = LoteRecepcionInsumo(
        insumo_id=insumo.id,
        proveedor_id=proveedor.id,
        numero_lote=numero_lote,
        cantidad=10,
        cantidad_disponible=5,
        fecha_recepcion=recepcion,
        fecha_vencimiento=vencimiento,
        registrado_por_id=persona.id,
        activo=True,
        conciliacion=False,
        clave_operacion=str(uuid4()),
    )
    db_session.add(lote)
    db_session.flush()
    return lote


@pytest.fixture
def lote_con_problemas(
    db_session, producto, insumo_activo, proveedor_activo, persona_operadora, persona_administradora
):
    lote = crear_lote(db_session, producto, persona_operadora, estado=EstadoLote.EN_PRODUCCION)
    sector = Sector(nombre="Sector expediente", activo=True)
    db_session.add(sector)
    db_session.flush()
    paila = crear_equipo(db_session, sector, "Paila 2", periodicidad_dias=180)
    camara = crear_equipo(db_session, sector, "Cámara de frío 1", periodicidad_dias=180)
    envasadora = crear_equipo(db_session, sector, "Envasadora")
    calibrar(db_session, paila, FECHA - timedelta(days=30), FECHA + timedelta(days=150))
    calibrar(db_session, camara, FECHA - timedelta(days=200), FECHA - timedelta(days=5))

    coccion = PasoLote(
        lote_id=lote.id, orden=1, nombre="Cocción", procedimiento="Cocinar", equipo_id=paila.id,
        temperatura_celsius=105, punto_control=True, estado=EstadoPasoLote.REALIZADO, valor_medido=98,
        realizado_por_id=persona_operadora.id, realizado_en=a_las(FECHA, 9),
    )
    db_session.add_all([
        coccion,
        PasoLote(lote_id=lote.id, orden=2, nombre="Enfriado", procedimiento="Enfriar", equipo_id=camara.id),
        PasoLote(
            lote_id=lote.id, orden=3, nombre="Control final", procedimiento="Medir", equipo_id=envasadora.id,
            temperatura_celsius=105, punto_control=True, estado=EstadoPasoLote.REALIZADO, valor_medido=104,
            realizado_por_id=persona_operadora.id, realizado_en=a_las(FECHA, 11),
        ),
    ])
    db_session.flush()
    db_session.add(MovimientoPasoLote(
        paso_id=coccion.id, accion=AccionPasoLote.REALIZADO, personal_id=persona_operadora.id,
        fecha_hora=a_las(FECHA, 9), valor_medido=98, observacion="No llegó a temperatura", foto_path="foto.jpg",
    ))

    db_session.add_all([
        RegistroTemperatura(
            equipo_id=camara.id, operario_id=persona_operadora.id, temperatura_registrada=4.1,
            fecha_hora_registro=a_las(FECHA, 10), fuera_de_rango=False,
        ),
        RegistroTemperatura(
            equipo_id=camara.id, operario_id=persona_operadora.id, temperatura_registrada=9.5,
            fecha_hora_registro=a_las(FECHA - timedelta(days=1), 10), fuera_de_rango=True,
        ),
    ])

    tipo = TipoIncidente(nombre="Corte de energía", color="#dc3545", activo=True)
    db_session.add(tipo)
    db_session.flush()
    db_session.add_all([
        Incidente(
            descripcion="Se cortó la luz en producción", fecha_hora=a_las(FECHA, 8), tipo_id=tipo.id,
            reportado_por_dni=persona_administradora.dni,
        ),
        Incidente(
            descripcion="Incidente de otro día", fecha_hora=a_las(FECHA - timedelta(days=1), 8), tipo_id=tipo.id,
            reportado_por_dni=persona_administradora.dni,
        ),
    ])

    vencido = recibir(
        db_session, insumo_activo, proveedor_activo, persona_administradora, "LR-VENCIDO",
        FECHA - timedelta(days=10), FECHA - timedelta(days=1),
    )
    posterior = recibir(
        db_session, insumo_activo, proveedor_activo, persona_administradora, "LR-POSTERIOR",
        FECHA + timedelta(days=1), FECHA + timedelta(days=30),
    )
    db_session.add_all([
        LoteInsumo(lote_id=lote.id, insumo_id=insumo_activo.id, cantidad_usada=5),
        ConsumoLoteRecepcion(lote_produccion_id=lote.id, lote_recepcion_id=vencido.id, cantidad=3),
        ConsumoLoteRecepcion(lote_produccion_id=lote.id, lote_recepcion_id=posterior.id, cantidad=1.5),
        ConsumoStockAnterior(lote_produccion_id=lote.id, insumo_id=insumo_activo.id, cantidad=0.5),
    ])
    db_session.commit()
    return lote


def expediente(client, headers, lote_id):
    return client.get(f"/lotes-produccion/{lote_id}/expediente", headers=headers)


def test_el_expediente_incluye_el_lote_con_su_codigo_de_barras(client, headers_administradora, lote_con_problemas):
    respuesta = expediente(client, headers_administradora, lote_con_problemas.id)

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["lote"]["codigo"] == lote_con_problemas.codigo
    assert datos["lote"]["codigo_barras"] == lote_con_problemas.codigo_barras


def test_el_expediente_detecta_las_alertas_automaticas(client, headers_administradora, lote_con_problemas):
    alertas = expediente(client, headers_administradora, lote_con_problemas.id).json()["alertas"]

    assert sorted(alerta["tipo"] for alerta in alertas) == sorted([
        TipoAlerta.PUNTO_CONTROL_FUERA_DE_RANGO,
        TipoAlerta.CALIBRACION_VENCIDA,
        TipoAlerta.INSUMO_VENCIDO,
        TipoAlerta.INSUMO_RECIBIDO_DESPUES,
        TipoAlerta.INSUMO_SIN_ORIGEN,
    ])
    mensajes = {alerta["tipo"]: alerta["mensaje"] for alerta in alertas}
    assert "se esperaban 105 °C y se midieron 98 °C" in mensajes[TipoAlerta.PUNTO_CONTROL_FUERA_DE_RANGO]
    assert mensajes[TipoAlerta.CALIBRACION_VENCIDA].startswith("Cámara de frío 1 tenía la calibración vencida")
    assert "LR-VENCIDO" in mensajes[TipoAlerta.INSUMO_VENCIDO]
    assert "LR-POSTERIOR" in mensajes[TipoAlerta.INSUMO_RECIBIDO_DESPUES]
    assert mensajes[TipoAlerta.INSUMO_SIN_ORIGEN].startswith("0,5 ")


def test_los_pasos_incluyen_medicion_estado_y_movimientos(client, headers_administradora, lote_con_problemas):
    pasos = expediente(client, headers_administradora, lote_con_problemas.id).json()["pasos"]

    assert [paso["orden"] for paso in pasos] == [1, 2, 3]
    coccion, enfriado, control = pasos
    assert coccion["equipo"] == "Paila 2"
    assert coccion["fuera_de_rango"] is True
    assert coccion["realizado_por"] == f"{lote_con_problemas.registrado_por.apellido}, {lote_con_problemas.registrado_por.nombre}"
    assert coccion["movimientos"][0]["con_foto"] is True
    assert enfriado["estado"] == EstadoPasoLote.PENDIENTE
    assert control["fuera_de_rango"] is False


def test_los_equipos_muestran_calibracion_y_temperaturas_del_dia(client, headers_administradora, lote_con_problemas):
    equipos = {
        equipo["nombre"]: equipo
        for equipo in expediente(client, headers_administradora, lote_con_problemas.id).json()["equipos"]
    }

    assert equipos["Paila 2"]["calibracion_vigente"] is True
    assert equipos["Cámara de frío 1"]["calibracion_vigente"] is False
    assert equipos["Envasadora"]["requiere_calibracion"] is False
    assert equipos["Envasadora"]["calibracion_vigente"] is None
    assert [registro["temperatura"] for registro in equipos["Cámara de frío 1"]["temperaturas"]] == [4.1]
    assert equipos["Cámara de frío 1"]["pasos"] == [2]


def test_el_expediente_lista_solo_los_incidentes_del_dia(client, headers_administradora, lote_con_problemas):
    incidentes = expediente(client, headers_administradora, lote_con_problemas.id).json()["incidentes"]

    assert [incidente["descripcion"] for incidente in incidentes] == ["Se cortó la luz en producción"]
    assert incidentes[0]["tipo"] == "Corte de energía"


def test_el_expediente_alerta_equipos_sin_calibracion_registrada(
    client, headers_administradora, db_session, producto, persona_operadora
):
    lote = crear_lote(db_session, producto, persona_operadora)
    sector = Sector(nombre="Sector sin calibrar", activo=True)
    db_session.add(sector)
    db_session.flush()
    horno = crear_equipo(db_session, sector, "Horno", periodicidad_dias=365)
    db_session.add(PasoLote(lote_id=lote.id, orden=1, nombre="Horneado", procedimiento="Hornear", equipo_id=horno.id))
    db_session.commit()

    alertas = expediente(client, headers_administradora, lote.id).json()["alertas"]

    assert [alerta["mensaje"] for alerta in alertas] == ["Horno no tenía calibración registrada al producir el lote (paso 1)."]


def test_el_expediente_alerta_cierre_con_pasos_pendientes_y_anulacion(
    client, headers_administradora, db_session, producto, persona_operadora
):
    lote = crear_lote(
        db_session, producto, persona_operadora,
        estado=EstadoLote.ANULADO, pasos_pendientes_al_cerrar=2, motivo_cierre_pendientes="Se cortó la luz",
        motivo_anulacion="Insumo fuera de especificación",
    )
    db_session.commit()

    alertas = expediente(client, headers_administradora, lote.id).json()["alertas"]

    assert {alerta["tipo"]: alerta["mensaje"] for alerta in alertas} == {
        TipoAlerta.CIERRE_CON_PASOS_PENDIENTES: "El lote se cerró con 2 paso(s) sin realizar. Motivo: Se cortó la luz",
        TipoAlerta.LOTE_ANULADO: "El lote fue anulado. Motivo: Insumo fuera de especificación",
    }


def test_un_lote_sin_problemas_no_tiene_alertas(client, headers_administradora, db_session, producto, persona_operadora):
    lote = crear_lote(db_session, producto, persona_operadora)
    db_session.commit()

    datos = expediente(client, headers_administradora, lote.id).json()

    assert datos["alertas"] == []
    assert datos["insumos"] == []
    assert datos["pasos"] == []
    assert datos["equipos"] == []


def test_un_operario_no_puede_obtener_el_expediente(client, headers_operadora, lote_con_problemas):
    assert expediente(client, headers_operadora, lote_con_problemas.id).status_code == 403


def test_el_expediente_de_un_lote_inexistente_devuelve_404(client, headers_administradora):
    assert expediente(client, headers_administradora, 999999).status_code == 404
