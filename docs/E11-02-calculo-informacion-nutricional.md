# E11-02 – Cálculo de la información nutricional

## Cómo calcula

1. Por cada renglón de la versión de receta toma los gramos usados (composición de E10-01)
   y suma `gramos × valor por 100 g / 100` de cada nutriente.
2. Los aditivos solo suman energía y sodio, y solo si tienen la marca «Aporta energía o sodio».
3. Lleva el total a 100 g (o 100 ml) con el rendimiento final:
   - rendimiento en peso → por 100 g; en volumen → por 100 ml;
   - rendimiento en unidades (un, caja, paquete) → hace falta el **peso final del rendimiento (g)**
     que se carga en la versión de la receta.
4. Por porción: `valor por 100 × porción / 100`. Una porción en unidades se pasa a gramos con el
   peso final dividido por la cantidad de unidades del rendimiento.
5. % VD: valor por porción / valor diario × 100.
6. El valor energético en kJ se obtiene de las kcal × 4,2.

El resultado sin redondear se guarda por versión. Se recalcula al crear la versión y cuando
cambian los datos nutricionales, las equivalencias o la marca de aporte de un insumo usado,
solo en la versión vigente o en las que estaban incompletas: las versiones archivadas
conservan el valor con el que se calcularon.

El redondeo, la unidad que se muestra, el umbral de «no significativo» y los valores diarios
se aplican al mostrar la tabla, así que cambiarlos en **Maestros de producción → Valores
diarios y redondeo** cambia la expresión sin recalcular.

## Valores iniciales (Res. GMC 46/03, Reglamento Técnico MERCOSUR)

| Nutriente | VD | No significativo si es ≤ |
|---|---|---|
| Valor energético | 2000 kcal | 4 kcal |
| Carbohidratos | 300 g | 0,5 g |
| Proteínas | 75 g | 0,5 g |
| Grasas totales | 55 g | 0,5 g |
| Grasas saturadas | 22 g | 0,2 g |
| Grasas trans | sin VD | 0,2 g |
| Fibra alimentaria | 25 g | 0,5 g |
| Sodio | 2400 mg | 5 mg |

Expresión: valor energético y % VD en enteros; valores de 10 o más sin decimales; menores a 10,
con un decimal. Azúcares totales y añadidos no tienen VD ni umbral en esa resolución: quedan
sin umbral y se pueden ajustar desde la pantalla.

## Producto de referencia de la cátedra (pendiente)

La prueba `tests/nutricion/test_informacion.py::test_el_producto_de_referencia_da_los_valores_validados_dentro_de_la_tolerancia`
lee `backend/tests/nutricion/datos/producto_referencia.json`. Hoy tiene un **ejemplo calculado a
mano por el equipo** (pan casero), no validado por un/a profesional.

Cuando la cátedra entregue el producto validado y la tolerancia:

1. Reemplazar en el JSON los ingredientes con sus gramos y valores por 100 g, el rendimiento,
   la porción, los valores esperados por 100 g y por porción, y la tolerancia
   (`relativa`: proporción, `absoluta`: diferencia mínima aceptada).
2. Completar `validado_por` y correr `pytest tests/nutricion`.

No hace falta tocar el código de la prueba.

## Datos incompletos (E11-03)

Antes de calcular, cada renglón de la versión se revisa y se arma la lista de faltantes:

- **Insumo**: nutrientes sin valor cargado y valores sin fuente registrada. Un valor tiene fuente
  registrada si se copió de un alimento de la base de referencia o si tiene el detalle de la
  fuente (rótulo, bibliografía o valor propio). Desde E11-03 la carga manual exige ese detalle;
  los datos anteriores sin detalle se completan con «Registrar fuente», sin cambiar el valor.
- **Aditivos**: sin la marca «Aporta energía o sodio» nunca cuentan como faltantes. Con la marca,
  cuentan si les falta la energía o el sodio.
- **Receta**: composición incompleta, rendimiento en unidades sin peso final o porción en otra
  magnitud que el rendimiento.

Con cualquier faltante la tabla queda **incompleta**: se ve la insignia «Incompleta» en la
pestaña, en el encabezado de la receta y en `informacion_nutricional_completa` de la versión
(para el rotulado, la vista previa y la exportación de las historias E11-04 y E13). El botón
«Completar» abre los datos del insumo en un modal y la tabla se recalcula al guardar.
