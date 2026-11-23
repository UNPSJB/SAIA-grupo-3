from datetime import date
from typing import Literal, Optional

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.abastecimiento import schemas as abastecimiento_schemas, services as abastecimiento_services
from src.aditivoReferencia import schemas as aditivo_schemas, services as aditivo_services
from src.alergeno import schemas as alergeno_schemas, services as alergeno_services
from src.auth.router_base import PermissionedRouter
from src.claseFuncional import schemas as clase_schemas, services as clase_services
from src.consumoQuimico import schemas as consumo_schemas, services as consumo_services
from src.database import get_db
from src.documentacion import schemas as doc_schemas
from src.documentacion.constants import EstadoVencimiento
from src.documentacion.vencimientos import listar_vencimientos_consolidados
from src.documentoTecnico import schemas as doc_tec_schemas, services as doc_tec_services
from src.documentoTecnico.models import EstadoDocumento, TipoDocumentoTecnico
from src.elementos import schemas as elemento_schemas, services as elemento_services
from src.equipos import schemas as equipo_schemas, services as equipo_services
from src.exportacion.services import recolectar_todos
from src.incidente import schemas as incidente_schemas, services as incidente_services
from src.incidente.constants import EstadoIncidente
from src.insumos import schemas as insumo_schemas, services as insumo_services
from src.insumosQuimicos import schemas as quimico_schemas, services as quimico_services
from src.loteProduccion import schemas as lote_schemas, services as lote_services
from src.loteProduccion.constants import EstadoLote
from src.personal import schemas as personal_schemas, services as personal_services
from src.plan import schemas as plan_schemas, services as plan_services
from src.planRealizado import schemas as plan_realizado_schemas, services as plan_realizado_services
from src.producto import schemas as producto_schemas, services as producto_services
from src.receta import schemas as receta_schemas, services as receta_services
from src.sector import schemas as sector_schemas, services as sector_services
from src.tarea import schemas as tarea_schemas, services as tarea_services
from src.tipoDocumento import schemas as tipo_doc_schemas, services as tipo_doc_services
from src.tipoIncidente import schemas as tipo_inc_schemas, services as tipo_inc_services
from src.unidadMedida import schemas as unidad_schemas, services as unidad_services

# PermissionedRouter exige permiso de administrar en todos los endpoints.
router = PermissionedRouter(prefix="/exportacion", tags=["exportacion"])


@router.get("/insumos", response_model=list[insumo_schemas.Insumo])
def exportar_insumos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
    solo_stock_bajo: bool = Query(False),
):
    return recolectar_todos(
        insumo_services.listar_insumos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
        solo_stock_bajo=solo_stock_bajo,
    )


@router.get("/insumos-quimicos", response_model=list[quimico_schemas.InsumoQuimico])
def exportar_insumos_quimicos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
    tipo_quimico: str | None = Query(None),
    solo_stock_bajo: bool = Query(False),
):
    return recolectar_todos(
        quimico_services.listar_insumos_quimicos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
        tipo_quimico=tipo_quimico,
        solo_stock_bajo=solo_stock_bajo,
    )


@router.get("/consumo-quimico", response_model=list[consumo_schemas.ConsumoQuimico])
def exportar_consumos_quimicos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("fecha"),
    orden: str = Query("desc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        consumo_services.listar_consumos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/reporte-consumos", response_model=list[consumo_schemas.ConsumoAcumulado])
def exportar_reporte_consumos(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    buscar: str = Query(""),
    ordenar_por: str = Query("nombre_insumo"),
    orden: str = Query("asc"),
):
    return consumo_services.obtener_consumo_acumulado(
        db, fecha_desde, fecha_hasta, buscar, ordenar_por, orden
    )


@router.get("/proveedores", response_model=list[abastecimiento_schemas.ProveedorOut])
def exportar_proveedores(
    db: Session = Depends(get_db),
    buscar: str = Query(""),
    mostrar_inactivos: bool = Query(False),
):
    return recolectar_todos(
        abastecimiento_services.listar_proveedores,
        db,
        buscar=buscar,
        mostrar_inactivos=mostrar_inactivos,
    )


@router.get("/lotes-insumo", response_model=list[abastecimiento_schemas.LoteOut])
def exportar_lotes_insumo(
    db: Session = Depends(get_db),
    insumo_id: int | None = Query(None, ge=1),
    proveedor_id: int | None = Query(None, ge=1),
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    estado: Literal["vencido", "por_vencer", "vigente"] | None = None,
    mostrar_inactivos: bool = Query(False),
    buscar: str = Query("", max_length=100),
):
    return recolectar_todos(
        abastecimiento_services.listar_recepciones,
        db,
        insumo_id=insumo_id,
        proveedor_id=proveedor_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
        mostrar_inactivos=mostrar_inactivos,
        buscar=buscar,
    )


@router.get("/productos", response_model=list[producto_schemas.Producto])
def exportar_productos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        producto_services.listar_productos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/lotes-produccion", response_model=list[lote_schemas.LoteProduccion])
def exportar_lotes_produccion(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("fecha_produccion"),
    orden: str = Query("desc"),
    buscar: str = Query(""),
    producto_id: int | None = Query(None, ge=1),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    estado: EstadoLote | None = Query(None),
    incluir_anulados: bool = Query(False),
):
    return recolectar_todos(
        lote_services.listar_lotes,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
        producto_id=producto_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        registrado_por_id=None,
        estado=estado,
        incluir_anulados=incluir_anulados,
    )


@router.get("/recetas", response_model=list[receta_schemas.RecetaDeProducto])
def exportar_recetas(
    db: Session = Depends(get_db),
    buscar: str = Query("", max_length=100),
    mostrar_inactivos: bool = Query(False),
):
    return receta_services.listar_recetas(db, buscar, mostrar_inactivos)


@router.get("/personal", response_model=list[personal_schemas.Personal])
def exportar_personal(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    proximos_a_vencer: bool = Query(False),
    buscar: str = Query(""),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
):
    return recolectar_todos(
        personal_services.listar_personal,
        db,
        mostrar_inactivos=mostrar_inactivos,
        proximos_a_vencer=proximos_a_vencer,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/equipos", response_model=list[equipo_schemas.Equipo])
def exportar_equipos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        equipo_services.listar_equipos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/sectores", response_model=list[sector_schemas.Sector])
def exportar_sectores(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        sector_services.listar_sectores,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/elementos", response_model=list[elemento_schemas.Elemento])
def exportar_elementos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        elemento_services.listar_elementos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/tareas", response_model=list[tarea_schemas.Tarea])
def exportar_tareas(
    db: Session = Depends(get_db),
    buscar: str = Query(""),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
):
    return recolectar_todos(
        tarea_services.listar_tareas,
        db,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/planes", response_model=list[plan_schemas.Plan])
def exportar_planes(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    buscar: str = Query(""),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
):
    return recolectar_todos(
        plan_services.listar_planes,
        db,
        mostrar_inactivos=mostrar_inactivos,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/planes-realizados", response_model=list[plan_realizado_schemas.PlanRealizado])
def exportar_planes_realizados(
    db: Session = Depends(get_db),
    desde: Optional[date] = Query(None),
    hasta: Optional[date] = Query(None),
    buscar: str = Query(""),
    ordenar_por: str = Query("fecha_ejecucion"),
    orden: str = Query("desc"),
):
    if desde and hasta and desde > hasta:
        raise HTTPException(
            status_code=400,
            detail="El rango de fechas no es válido: 'desde' es posterior a 'hasta'.",
        )
    return recolectar_todos(
        plan_realizado_services.listar_planes_realizados,
        db,
        desde=desde,
        hasta=hasta,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/incidentes", response_model=list[incidente_schemas.Incidente])
def exportar_incidentes(
    db: Session = Depends(get_db),
    buscar: str = Query(""),
    ordenar_por: str = Query("fecha_hora"),
    orden: str = Query("desc"),
    estado: EstadoIncidente | None = Query(None),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    tipo_id: int | None = Query(None, ge=1),
):
    return recolectar_todos(
        incidente_services.listar_incidentes,
        db,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
        reportado_por_dni=None,
        estado=estado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        tipo_id=tipo_id,
    )


@router.get("/incidentes-abiertos", response_model=list[incidente_schemas.IncidenteAbierto])
def exportar_incidentes_abiertos(
    db: Session = Depends(get_db),
    tipo_id: int | None = Query(None, ge=1),
    dias_minimos: int | None = Query(None, ge=0),
    buscar: str = Query(""),
    ordenar_por: str = Query("fecha_hora"),
    orden: str = Query("asc"),
):
    return recolectar_todos(
        incidente_services.listar_incidentes_abiertos,
        db,
        tipo_id=tipo_id,
        dias_minimos=dias_minimos,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/documentos-tecnicos", response_model=list[doc_tec_schemas.DocumentoTecnicoResumen])
def exportar_documentos_tecnicos(
    db: Session = Depends(get_db),
    estado: Optional[EstadoDocumento] = Query(None),
    tipo: Optional[TipoDocumentoTecnico] = Query(None),
    buscar: Optional[str] = Query(None, max_length=100),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
):
    return recolectar_todos(
        doc_tec_services.listar_documentos,
        db,
        estado=estado,
        tipo=tipo,
        busqueda=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/vencimientos", response_model=list[doc_schemas.VencimientoConsolidado])
def exportar_vencimientos(
    db: Session = Depends(get_db),
    origen: Literal[
        "todos", "documentacion", "calibracion", "lote_insumo", "habilitacion_proveedor"
    ] = Query("todos"),
    estado: EstadoVencimiento | None = Query(None),
    solo_alertas: bool = Query(False),
    buscar: str = Query(""),
    ordenar_por: Literal["fecha_vencimiento", "elemento"] = Query("fecha_vencimiento"),
    orden: Literal["asc", "desc"] = Query("asc"),
):
    return recolectar_todos(
        listar_vencimientos_consolidados,
        db,
        origen=origen,
        estado=estado,
        solo_alertas=solo_alertas,
        buscar=buscar,
        ordenar_por=ordenar_por,
        orden=orden,
    )


@router.get("/tipos-documento", response_model=list[tipo_doc_schemas.TipoDocumento])
def exportar_tipos_documento(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        tipo_doc_services.listar_tipos_documento,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/tipos-incidente", response_model=list[tipo_inc_schemas.TipoIncidente])
def exportar_tipos_incidente(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        tipo_inc_services.listar_tipos_incidente,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/unidades-medida", response_model=list[unidad_schemas.UnidadMedida])
def exportar_unidades_medida(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("id"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        unidad_services.listar_unidades_medida,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/clases-funcionales", response_model=list[clase_schemas.ClaseFuncional])
def exportar_clases_funcionales(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
):
    return recolectar_todos(
        clase_services.listar_clases,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
    )


@router.get("/aditivos-referencia", response_model=list[aditivo_schemas.AditivoReferencia])
def exportar_aditivos_referencia(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
    ordenar_por: str = Query("nombre"),
    orden: str = Query("asc"),
    buscar: str = Query(""),
    clase_funcional_id: Optional[int] = Query(None, gt=0),
):
    return recolectar_todos(
        aditivo_services.listar_aditivos,
        db,
        mostrar_inactivos=mostrar_inactivos,
        ordenar_por=ordenar_por,
        orden=orden,
        buscar=buscar,
        clase_funcional_id=clase_funcional_id,
    )


@router.get("/alergenos", response_model=list[alergeno_schemas.Alergeno])
def exportar_alergenos(
    db: Session = Depends(get_db),
    mostrar_inactivos: bool = Query(False),
):
    return alergeno_services.listar(db, mostrar_inactivos)