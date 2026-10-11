import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { API_BASE_URL } from '../../shared/libreria/api';
import type { Calibracion, CalibracionInput } from './types';
import { esCertificadoPdf } from './types';

interface CalibracionFormProps {
  calibracionInicial?: Calibracion | null;
  periodicidadDias?: number | null;
  onGuardar: (datos: CalibracionInput) => Promise<void>;
  onCancelar: () => void;
}

const FORMATOS_ACEPTADOS = 'image/*,application/pdf';

function hoyISO(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function CalibracionForm({
  calibracionInicial,
  periodicidadDias,
  onGuardar,
  onCancelar,
}: CalibracionFormProps) {
  const [fechaCalibracion, setFechaCalibracion] = useState('');
  const [otorgadoPor, setOtorgadoPor] = useState('');
  const [certificado, setCertificado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(calibracionInicial);

  useEffect(() => {
    if (calibracionInicial) {
      setFechaCalibracion(calibracionInicial.fecha_calibracion);
      setOtorgadoPor(calibracionInicial.otorgado_por);
    } else {
      setFechaCalibracion(hoyISO());
      setOtorgadoPor('');
    }
    setCertificado(null);
    setErrorEnvio(null);
    setValidated(false);
  }, [calibracionInicial]);

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
        fecha_calibracion: fechaCalibracion,
        otorgado_por: otorgadoPor.trim(),
        certificado,
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
        <Form.Label>Fecha de calibración</Form.Label>
        <Form.Control
          type="date"
          required
          max={hoyISO()}
          value={fechaCalibracion}
          onChange={(e) => setFechaCalibracion(e.target.value)}
        />
        <Form.Control.Feedback type="invalid">
          Ingresá una fecha válida (no puede ser posterior a hoy).
        </Form.Control.Feedback>
        <Form.Text className="text-muted">
          {periodicidadDias
            ? `El vencimiento se calcula sumando ${periodicidadDias} días a esta fecha.`
            : 'El equipo no tiene periodicidad definida, no se calculará vencimiento.'}
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Otorgado por</Form.Label>
        <Form.Control
          type="text"
          required
          maxLength={150}
          placeholder="Laboratorio, empresa o persona que certificó"
          value={otorgadoPor}
          onChange={(e) => setOtorgadoPor(e.target.value)}
        />
        <Form.Control.Feedback type="invalid">
          Indicá quién otorgó el certificado.
        </Form.Control.Feedback>
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>
          Evidencia (foto o PDF){esEdicion ? ' (opcional)' : ''}
        </Form.Label>
        <Form.Control
          type="file"
          accept={FORMATOS_ACEPTADOS}
          required={!esEdicion}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCertificado(e.target.files?.[0] ?? null)
          }
        />
        <Form.Control.Feedback type="invalid">
          Adjuntá el certificado o una foto de la calibración.
        </Form.Control.Feedback>
        {esEdicion && calibracionInicial?.certificado_path && !certificado && (
          <Form.Text className="text-muted">
            Evidencia actual:{' '}
            <a
              href={`${API_BASE_URL}${calibracionInicial.certificado_path}`}
              target="_blank"
              rel="noreferrer"
            >
              {esCertificadoPdf(calibracionInicial.certificado_path)
                ? 'Ver PDF actual'
                : 'Ver foto actual'}
            </a>
            . Si elegís un archivo se reemplaza.
          </Form.Text>
        )}
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
              : 'Registrar'}
        </Button>
      </div>
    </Form>
  );
}
