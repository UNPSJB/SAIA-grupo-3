import { Alert } from 'react-bootstrap';

interface ErrorAlertProps {
  mensaje: string;
}

export function ErrorAlert({ mensaje }: ErrorAlertProps) {
  return <Alert variant="danger">Error: {mensaje}</Alert>;
}