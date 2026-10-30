from datetime import date, datetime, time, timedelta
from typing import get_args

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.checklist.models import EstadoItem, ItemChecklist
from src.documentoTecnico.models import (
    DocumentoTecnico,
    EstadoDocumento,
    VersionDocumentoTecnico,
)
from src.equipos.models import Equipo
from src.loteProduccion.constants import EstadoLote
from src.loteProduccion.models import LoteProduccion
from src.tablero.constants import Agrupacion, DIAS_POR_DEFECTO
from src.tablero.services import calcular_cumplimiento
from src.vistaPublica import schemas
from src.vistaPublica.models import ConfiguracionVistaPublica


CODIGOS_PUBLICABLES = get_args(schemas.CodigoIndicador)


def obtener_codigos_habilitados(
    config: ConfiguracionVistaPublica,
) -> set[str]:
    codigos = {
        codigo.strip()
        for codigo in (config.indicadores_habilitados or "").split(",")
        if codigo.strip()
    }

    return codigos.intersection(CODIGOS_PUBLICABLES)


def _porcentaje(parte: int, total: int) -> float | None:
    if total == 0:
        return None

    return round(parte * 100 / total, 1)


def calcular_indicadores_publicos(
    db: Session,
    config: ConfiguracionVistaPublica,
) -> list[schemas.IndicadorPublico]:
    habilitados = obtener_codigos_habilitados(config)

    if not habilitados:
        return []

    hoy = date.today()
    hasta = hoy - timedelta(days=1)
    desde = hasta - timedelta(days=DIAS_POR_DEFECTO - 1)

    inicio = datetime.combine(desde, time.min)
    fin_exclusivo = datetime.combine(hoy, time.min)

    periodo = (
        f"Período: {desde.strftime('%d/%m/%Y')} "
        f"al {hasta.strftime('%d/%m/%Y')}."
    )
    fecha_actual = f"Estado al {hoy.strftime('%d/%m/%Y')}."

    indicadores: list[schemas.IndicadorPublico] = []

    def agregar(
        codigo: schemas.CodigoIndicador,
        titulo: str,
        valor: str,
        descripcion: str,
        porcentaje: float | None = None,
    ) -> None:
        indicadores.append(
            schemas.IndicadorPublico(
                codigo=codigo,
                titulo=titulo,
                valor=valor,
                porcentaje=porcentaje,
                descripcion=descripcion,
            )
        )

    def agregar_porcentaje(
        codigo: schemas.CodigoIndicador,
        titulo: str,
        parte: int,
        total: int,
        descripcion: str,
    ) -> None:
        porcentaje = _porcentaje(parte, total)

        agregar(
            codigo=codigo,
            titulo=titulo,
            valor=(
                "Sin datos"
                if porcentaje is None
                else f"{porcentaje:.1f} %"
            ),
            descripcion=descripcion,
            porcentaje=porcentaje,
        )

    # Conserva el mismo cálculo que el tablero interno:
    # tareas cuyos períodos terminaron dentro del rango.
    if habilitados.intersection({"cumplimiento", "tareas_realizadas"}):
        datos = calcular_cumplimiento(
            db,
            fecha_desde=desde,
            fecha_hasta=hasta,
            agrupacion=Agrupacion.DIA,
        )

        if "cumplimiento" in habilitados:
            agregar_porcentaje(
                codigo="cumplimiento",
                titulo="Tareas de limpieza cumplidas",
                parte=datos["realizadas"],
                total=datos["total"],
                descripcion=periodo,
            )

        if "tareas_realizadas" in habilitados:
            agregar(
                codigo="tareas_realizadas",
                titulo="Tareas realizadas",
                valor=(
                    str(datos["realizadas"])
                    if datos["total"] > 0
                    else "Sin datos"
                ),
                descripcion=periodo,
            )

    # Cuenta fechas diferentes de realización.
    # No utiliza la fecha de vencimiento del checklist.
    if "dias_limpieza" in habilitados:
        dias = db.scalar(
            select(
                func.count(
                    func.distinct(func.date(ItemChecklist.realizada_en))
                )
            ).where(
                ItemChecklist.estado == EstadoItem.REALIZADA,
                ItemChecklist.realizada_en >= inicio,
                ItemChecklist.realizada_en < fin_exclusivo,
            )
        ) or 0

        agregar(
            codigo="dias_limpieza",
            titulo="Días con limpieza registrada",
            valor=f"{dias} / {DIAS_POR_DEFECTO}",
            descripcion=periodo,
        )

    if "equipos_calibrados" in habilitados:
        equipos = db.execute(
            select(
                Equipo.fecha_ultima_calibracion,
                Equipo.periodicidad_dias,
            ).where(
                Equipo.activo.is_(True),
                Equipo.periodicidad_dias > 0,
            )
        ).all()

        # Incluye en el total los equipos que requieren calibración
        # aunque todavía no tengan una fecha registrada.
        vigentes = sum(
            1
            for ultima, periodicidad in equipos
            if ultima is not None
            and ultima <= hoy
            and ultima + timedelta(days=periodicidad) >= hoy
        )

        agregar_porcentaje(
            codigo="equipos_calibrados",
            titulo="Equipos con calibración vigente",
            parte=vigentes,
            total=len(equipos),
            descripcion=fecha_actual,
        )

    if "documentos_tecnicos" in habilitados:
        # El modelo no tiene fecha de vencimiento.
        # Se mide la existencia de una versión vigente
        # entre los documentos que no están archivados.
        activos = (
            DocumentoTecnico.estado == EstadoDocumento.VIGENTE
        )

        total = db.scalar(
            select(func.count())
            .select_from(DocumentoTecnico)
            .where(activos)
        ) or 0

        con_version_vigente = db.scalar(
            select(func.count())
            .select_from(DocumentoTecnico)
            .where(
                activos,
                DocumentoTecnico.versiones.any(
                    VersionDocumentoTecnico.estado
                    == EstadoDocumento.VIGENTE
                ),
            )
        ) or 0

        agregar_porcentaje(
            codigo="documentos_tecnicos",
            titulo="Documentos técnicos con versión vigente",
            parte=con_version_vigente,
            total=total,
            descripcion=fecha_actual,
        )

    if habilitados.intersection(
        {"productos_elaborados", "lotes_producidos"}
    ):
        productos, lotes = db.execute(
            select(
                func.count(
                    func.distinct(LoteProduccion.producto_id)
                ),
                func.count(LoteProduccion.id),
            ).where(
                LoteProduccion.activo.is_(True),
                LoteProduccion.estado == EstadoLote.CERRADO,
                LoteProduccion.fecha_cierre >= inicio,
                LoteProduccion.fecha_cierre < fin_exclusivo,
            )
        ).one()

        if "productos_elaborados" in habilitados:
            agregar(
                codigo="productos_elaborados",
                titulo="Productos distintos elaborados",
                valor=str(productos),
                descripcion=periodo,
            )

        if "lotes_producidos" in habilitados:
            agregar(
                codigo="lotes_producidos",
                titulo="Lotes producidos",
                valor=str(lotes),
                descripcion=periodo,
            )

    return indicadores