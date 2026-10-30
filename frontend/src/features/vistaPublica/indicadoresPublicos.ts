export const INDICADORES_PUBLICOS = [
  {
    codigo: 'tareas_realizadas',
    titulo: 'Tareas realizadas',
    categoria: 'actividad',
    icono: 'bi bi-clipboard-check',
    descripcion:
      'Cantidad de tareas realizadas del checklist cuyos períodos terminaron en los últimos 30 días completos.',
  },
  {
    codigo: 'dias_limpieza',
    titulo: 'Días con limpieza registrada',
    categoria: 'actividad',
    icono: 'bi bi-calendar-check',
    descripcion:
      'Días de los últimos 30 días completos con al menos una tarea registrada como realizada. No implica que todas las tareas de ese día se completaron.',
  },
  {
    codigo: 'cumplimiento',
    titulo: 'Tareas de limpieza cumplidas',
    categoria: 'porcentaje',
    icono: 'bi bi-check2-square',
    descripcion:
      'Porcentaje de tareas previstas que se registraron como realizadas. Utiliza el mismo cálculo que el tablero de gestión.',
  },
  {
    codigo: 'equipos_calibrados',
    titulo: 'Equipos con calibración vigente',
    categoria: 'porcentaje',
    icono: 'bi bi-speedometer2',
    descripcion:
      'Porcentaje de equipos activos con calibración vigente, entre los que tienen una periodicidad de calibración configurada.',
  },
  {
    codigo: 'documentos_tecnicos',
    titulo: 'Documentos técnicos con versión vigente',
    categoria: 'porcentaje',
    icono: 'bi bi-file-earmark-check',
    descripcion:
      'Porcentaje de documentos técnicos no archivados que cuentan con una versión vigente. No publica sus nombres ni archivos.',
  },
  {
    codigo: 'productos_elaborados',
    titulo: 'Productos distintos elaborados',
    categoria: 'produccion',
    icono: 'bi bi-basket',
    descripcion:
      'Cantidad de productos diferentes presentes en lotes activos cerrados durante los últimos 30 días completos. Cuenta variedades, no kilos, litros ni unidades.',
  },
  {
    codigo: 'lotes_producidos',
    titulo: 'Lotes producidos',
    categoria: 'produccion',
    icono: 'bi bi-box-seam',
    descripcion:
      'Cantidad de lotes activos cerrados durante los últimos 30 días completos, según su fecha de cierre.',
  },
] as const;

export type DefinicionIndicador =
  (typeof INDICADORES_PUBLICOS)[number];

export type CodigoIndicador = DefinicionIndicador['codigo'];