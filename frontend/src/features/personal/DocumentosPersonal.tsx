import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Form, Modal, Table } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { getTiposDocumento } from '../tipoDocumento/tipoDocumentoApi';
import {
  createDocumento,
  deleteDocumento,
  getDocumentosPersonal,
  updateDocumento,
  type DocumentoDatos,
} from './documentacionApi';
import type { Documento, TipoDocumento } from './types';

interface DocumentosPersonalProps {
  personalId: number;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Sin fecha cargada';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function DocumentosPersonal({ personalId }: DocumentosPersonalProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [personalCargadoId, setPersonalCargadoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState<Documento | null>(null);
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | ''>('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [validado, setValidado] = useState(false);

  useEffect(() => {
    let componenteActivo = true;
    Promise.all([getDocumentosPersonal(personalId), getTiposDocumento(1, 100)])
      .then(([datos, tipos]) => {
        if (componenteActivo) {
          setDocumentos(datos);
          setTiposDocumento(tipos.items.filter((tipo) => tipo.activo));
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (componenteActivo) setError(err.message);
      })
      .finally(() => {
        if (componenteActivo) setPersonalCargadoId(personalId);
      });

    return () => {
      componenteActivo = false;
    };
  }, [personalId]);

  const cargando = personalCargadoId !== personalId;

  const abrirFormulario = (documento?: Documento) => {
    setDocumentoEditando(documento ?? null);
    setTipoDocumentoId(documento?.tipo_documento_id ?? tiposDocumento[0]?.id ?? '');
    setFechaVencimiento(documento?.fecha_vencimiento ?? '');
    setValidado(false);
    setError(null);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;
    setMostrarFormulario(false);
    setDocumentoEditando(null);
  };

  const handleGuardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    if (!formulario.checkValidity()) {
      evento.stopPropagation();
      setValidado(true);
      return;
    }

    setGuardando(true);
    setError(null);
    const datos: DocumentoDatos = {
      tipo_documento_id: Number(tipoDocumentoId),
      fecha_vencimiento: fechaVencimiento,
    };

    try {
      if (documentoEditando) {
        const actualizado = await updateDocumento(documentoEditando.id, datos);
        setDocumentos((actuales) =>
          actuales.map((documento) =>
            documento.id === actualizado.id ? actualizado : documento
          )
        );
      } else {
        const creado = await createDocumento(personalId, datos);
        setDocumentos((actuales) => [...actuales, creado]);
      }
      setMostrarFormulario(false);
      setDocumentoEditando(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el documento.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (documento: Documento) => {
    if (!window.confirm(`¿Eliminar el documento "${documento.tipo_documento.nombre}"?`)) return;
    setError(null);
    try {
      await deleteDocumento(documento.id);
      setDocumentos((actuales) =>
        actuales.filter((actual) => actual.id !== documento.id)
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el documento.');
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0 mt-4">
        <Card.Header className="bg-light text-secondary d-flex justify-content-between align-items-center gap-2 py-3">
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>Documentación y vencimientos
          </h5>
          <Button
            variant="success"
            size="sm"
            onClick={() => abrirFormulario()}
            className="d-flex align-items-center gap-1"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Agregar documento</span>
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {error && !mostrarFormulario && (
            <div className="p-3 pb-0"><ErrorAlert mensaje={error} /></div>
          )}
          {cargando ? (
            <p className="text-muted text-center my-4">Cargando documentos...</p>
          ) : (
            <Table striped hover responsive className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Tipo de documento</th>
                  <th>Fecha de vencimiento</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      No hay documentos cargados para esta persona.
                    </td>
                  </tr>
                ) : (
                  documentos.map((documento) => (
                    <tr key={documento.id}>
                      <td><strong>{documento.tipo_documento.nombre}</strong></td>
                      <td>{formatearFecha(documento.fecha_vencimiento)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="warning"
                            size="sm"
                            title="Editar o renovar"
                            aria-label={`Editar o renovar ${documento.tipo_documento.nombre}`}
                            onClick={() => abrirFormulario(documento)}
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            title="Eliminar"
                            aria-label={`Eliminar ${documento.tipo_documento.nombre}`}
                            onClick={() => void handleEliminar(documento)}
                          >
                            <i className="bi bi-trash3-fill"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={mostrarFormulario} onHide={cerrarFormulario} centered>
        <Form noValidate validated={validado} onSubmit={handleGuardar}>
          <Modal.Header closeButton>
            <Modal.Title>
              {documentoEditando ? 'Editar o renovar documento' : 'Agregar documento'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <ErrorAlert mensaje={error} />}
            <Form.Group className="mb-3">
              <Form.Label>Tipo de documento</Form.Label>
              <Form.Select
                required
                value={tipoDocumentoId}
                onChange={(evento) =>
                  setTipoDocumentoId(
                    evento.target.value ? Number(evento.target.value) : ''
                  )
                }
              >
                <option value="">Seleccioná un tipo</option>
                {[
                  ...tiposDocumento,
                  ...(documentoEditando
                    && !tiposDocumento.some((tipo) => tipo.id === documentoEditando.tipo_documento_id)
                    ? [documentoEditando.tipo_documento]
                    : []),
                ].map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Fecha de vencimiento</Form.Label>
              <Form.Control
                type="date"
                required
                value={fechaVencimiento}
                onChange={(evento) => setFechaVencimiento(evento.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Ingresá una fecha de vencimiento válida.
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={cerrarFormulario} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : documentoEditando ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
