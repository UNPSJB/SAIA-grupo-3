import type { ReactNode } from 'react';
import { Table } from 'react-bootstrap';

export interface ColumnaTabla<T> {
  titulo: string;
  valor: (fila: T) => ReactNode;
  /** Alinea a la derecha (números). */
  numerica?: boolean;
}

interface TablaDatosProps<T> {
  filas: T[];
  columnas: ColumnaTabla<T>[];
  clave: (fila: T) => string | number;
}

/** Vista de tabla de un gráfico: los mismos datos, para leerlos con exactitud. */
export function TablaDatos<T>({ filas, columnas, clave }: TablaDatosProps<T>) {
  return (
    <Table size="sm" hover responsive className="grafico-tabla mb-0 align-middle">
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th key={columna.titulo} className={columna.numerica ? 'text-end' : undefined}>
              {columna.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={clave(fila)}>
            {columnas.map((columna) => (
              <td key={columna.titulo} className={columna.numerica ? 'text-end' : undefined}>
                {columna.valor(fila)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
