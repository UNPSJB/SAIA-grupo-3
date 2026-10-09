import type { FieldErrors } from 'react-hook-form';
import { Alert } from 'react-bootstrap';
function messages(errors: object): string[] {
  return Object.entries(errors).flatMap(([key, error]) => {
    if (!error || typeof error !== 'object' || key === 'ref') return [];
    if ('message' in error && typeof error.message === 'string') return [error.message];
    return messages(error);
  });
}
export function FormErrors({ errors }: { errors: FieldErrors }) {
  const all = [...new Set(messages(errors))];
  return all.length ? (
    <Alert variant="danger" role="alert">
      <ul className="mb-0">
        {all.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Alert>
  ) : null;
}
