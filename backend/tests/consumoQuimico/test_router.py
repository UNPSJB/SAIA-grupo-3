from datetime import date
from sqlalchemy import select
from src.insumosQuimicos.models import InsumoQuimico, TipoQuimico
from src.notificaciones.models import Notificacion


def test_consumir_y_modificar_actualiza_stock_y_aviso(client, db_session, unidad_medida, admin_headers):
    q=InsumoQuimico(nombre='Químico HTTP',tipo_quimico=TipoQuimico.DETERGENTE,cantidad=10,stock_minimo=5,unidad_medida_id=unidad_medida.id,activo=True)
    db_session.add(q);db_session.commit()
    datos={'insumo_quimico_id':q.id,'cantidad_utilizada':5,'fecha':date.today().isoformat(),'tarea_limpieza':'Limpiar'}
    r=client.post('/consumo-quimico/',json=datos,headers=admin_headers)
    assert r.status_code==200,r.text
    db_session.refresh(q);assert q.cantidad==5
    aviso=db_session.scalar(select(Notificacion).where(Notificacion.clave==f'stock-bajo-quimico-{q.id}'))
    assert aviso and not aviso.resuelta
    r=client.put(f"/consumo-quimico/{r.json()['id']}",json={'cantidad_utilizada':1},headers=admin_headers)
    assert r.status_code==200,r.text
    db_session.refresh(q);db_session.refresh(aviso)
    assert q.cantidad==9 and aviso.resuelta
