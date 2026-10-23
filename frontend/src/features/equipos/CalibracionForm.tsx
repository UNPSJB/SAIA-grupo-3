import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { ErrorAlert } from '../../shared/components/ErrorAlert';
import { EnlaceArchivo } from '../../shared/components/EnlaceArchivo';
import { FORMATOS_IMAGEN_Y_PDF, validarArchivo } from '../../shared/libreria/archivos';
import type { Calibracion, CalibracionInput } from './types';
import { esCertificadoPdf } from './types';

interface CalibracionFormProps {
  calibracionInicial?: Calibracion | null;
  periodicidadDias?: number | null;
  onGuardar: (datos: CalibracionInput) => Promise<void>;
  onCancelar: () => void;
}

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
  const [fechaCalibracion, setFechaCalibracion] = useState(
    () => calibracionInicial?.fecha_calibracion ?? hoyISO(),
  );
  const [otorgadoPor, setOtorgadoPor] = useState(
    () => calibracionInicial?.otorgado_por ?? '',
  );
  const [certificado, setCertificado] = useState<File | null>(null);
  const [errorCertificado, setErrorCertificado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const esEdicion = Boolean(calibracionInicial);

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
          accept={FORMATOS_IMAGEN_Y_PDF}
          required={!esEdicion}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const archivo = e.target.files?.[0] ?? null;
            const error = validarArchivo(archivo, FORMATOS_IMAGEN_Y_PDF);
            setErrorCertificado(error);
            setCertificado(error ? null : archivo);
            if (error) e.target.value = '';
          }}
        />
        {errorCertificado && <Form.Text className="text-danger d-block">{errorCertificado}</Form.Text>}
        <Form.Control.Feedback type="invalid">
          Adjuntá el certificado o una foto de la calibración.
        </Form.Control.Feedback>
        {esEdicion && calibracionInicial?.certificado_path && !certificado && (
          <Form.Text className="text-muted">
            Evidencia actual:{' '}
            <EnlaceArchivo
              ruta={calibracionInicial.certificado_path}
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center justify-content-center gap-1 text-nowrap"
            >
              <i className={`bi ${esCertificadoPdf(calibracionInicial.certificado_path) ? 'bi-file-earmark-pdf' : 'bi-image'}`} aria-hidden="true"></i>
              {esCertificadoPdf(calibracionInicial.certificado_path)
                ? 'Ver PDF actual'
                : 'Ver foto actual'}
            </EnlaceArchivo>
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
