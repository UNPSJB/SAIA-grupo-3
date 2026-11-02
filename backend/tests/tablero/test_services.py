from datetime import date, timedelta
import pytest
from fastapi import HTTPException
from src.tablero.services import calcular_cumplimiento
from src.tablero.constants import Agrupacion
from src.tablero.produccion import calcular_produccion
from src.checklist.models import EstadoItem, ItemChecklist
from src.loteProduccion.models import LoteProduccion


def test_cumplimiento_con_datos_reales_y_periodos_vacios(db_session, item_checklist):
    item, _ = item_checklist
    hoy = date(2026, 10, 20)
    item.periodo_inicio = hoy - timedelta(days=2)
    item.periodo_fin = hoy - timedelta(days=2)
    item.estado = EstadoItem.REALIZADA
    db_session.add(ItemChecklist(plan_id=item.plan_id, tarea_id=item.tarea_id,
        responsable_id=item.responsable_id, frecuencia=item.frecuencia,
        periodo_inicio=hoy-timedelta(days=1), periodo_fin=hoy-timedelta(days=1), estado=EstadoItem.PENDIENTE))
    db_session.commit()
    diario = calcular_cumplimiento(db_session, hoy-timedelta(days=2), hoy, Agrupacion.DIA, hoy)
    assert diario['total'] == 2 and diario['realizadas'] == 1 and diario['porcentaje'] == 50
    assert [p['porcentaje'] for p in diario['puntos']] == [100, 0, None]
    semanal = calcular_cumplimiento(db_session, hoy-timedelta(days=2), hoy, Agrupacion.SEMANA, hoy)
    assert semanal['total'] == 2 and semanal['porcentaje'] == 50


@pytest.mark.parametrize('desde,hasta', [(date(2026,1,2),date(2026,1,1)),(date(2020,1,1),date(2026,1,1))])
def test_rangos_invalidos(db_session, desde, hasta):
    with pytest.raises(HTTPException): calcular_cumplimiento(db_session, desde, hasta, Agrupacion.DIA)
    with pytest.raises(HTTPException): calcular_produccion(db_session, desde, hasta)


def test_produccion_suma_por_dia_excluye_bajas_y_filtra(db_session, producto, persona_operadora):
    hoy = date.today()
    for i, (cantidad, fecha, activo) in enumerate([(3,hoy,True),(4,hoy,True),(50,hoy,False),(90,hoy-timedelta(days=40),True)]):
        db_session.add(LoteProduccion(codigo=f'TEST-{i}', producto_id=producto.id, fecha_produccion=fecha,
            cantidad=cantidad, registrado_por_id=persona_operadora.id, activo=activo))
    db_session.commit()
    resultado = calcular_produccion(db_session, hoy, hoy, producto.id)
    assert len(resultado.series) == 1 and resultado.series[0].total == 7
    assert len(resultado.series[0].puntos) == 1 and resultado.series[0].puntos[0].cantidad == 7
    with pytest.raises(HTTPException) as error: calcular_produccion(db_session, hoy, hoy, 999999)
    assert error.value.status_code == 404


def test_tablero_vacio_no_inventa_datos(db_session):
    hoy = date.today()
    cumplimiento = calcular_cumplimiento(db_session, hoy, hoy, Agrupacion.DIA)
    assert cumplimiento['total'] == 0 and cumplimiento['porcentaje'] is None
    assert calcular_produccion(db_session, hoy, hoy).series == []
