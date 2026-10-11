import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import type { DocumentoDatos } from './documentacionApi';
import type { Documento, TipoDocumento } from './types';

interface DocumentoFormProps {
  documentoInicial?: Documento | null;
  tiposDocumento: TipoDocumento[];
  onGuardar: (datos: DocumentoDatos) => Promise<void>;
  onCancelar: () => void;
}

export function DocumentoForm({
  documentoInicial,
  tiposDocumento,
  onGuardar,
  onCancelar,
}: DocumentoFormProps) {
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | ''>('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(documentoInicial);

  useEffect(() => {
    if (documentoInicial) {
      setTipoDocumentoId(documentoInicial.tipo_documento_id);
      setFechaVencimiento(documentoInicial.fecha_vencimiento ?? '');
    } else {
      setTipoDocumentoId(tiposDocumento[0]?.id ?? '');
      setFechaVencimiento('');
    }
    setErrorEnvio(null);
    setValidated(false);
  }, [documentoInicial, tiposDocumento]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorEnvio(null);

    const form = e.currentTarget;

    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setEnviando(true);

    try {
      await onGuardar({
        tipo_documento_id: Number(tipoDocumentoId),
        fecha_vencimiento: fechaVencimiento,
      });
    } catch (err: unknown) {
      setErrorEnvio(
        err instanceof Error ? err.message : 'Error al guardar los datos.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      {errorEnvio && <ErrorAlert mensaje={errorEnvio} />}

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
            ...(documentoInicial &&
            !tiposDocumento.some(
              (tipo) => tipo.id === documentoInicial.tipo_documento_id
            )
              ? [documentoInicial.tipo_documento]
              : []),
          ].map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-4">
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

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={enviando}>
          {enviando
            ? 'Guardando...'
            : esEdicion
              ? 'Guardar cambios'
              : 'Agregar'}
        </Button>
      </div>
    </Form>
  );
}
