import json
from sqlalchemy import select
from src.notificaciones.models import Notificacion


def test_finalizar_tarea_genera_aviso_y_guarda_actor(client, db_session, item_checklist, headers_operadora):
    item,q=item_checklist
    datos={'consumos':[{'insumo_quimico_id':q.id,'cantidad_utilizada':5}]}
    respuesta=client.post(f'/checklist/items/{item.id}/finalizar',data={'consumos_json':json.dumps(datos)},headers=headers_operadora)
    assert respuesta.status_code==200,respuesta.text
    db_session.refresh(q);db_session.refresh(item)
    assert q.cantidad==5 and item.realizada_por_id==item.responsable_id
    assert db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{q.id}')) is not None


def test_finalizar_sin_permiso_no_descontar(client, db_session, item_checklist, headers_sin_permisos):
    item,q=item_checklist
    respuesta=client.post(f'/checklist/items/{item.id}/finalizar',headers=headers_sin_permisos)
    assert respuesta.status_code==403
    db_session.refresh(q);assert q.cantidad==10
