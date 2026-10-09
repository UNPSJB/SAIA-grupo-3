import { Children, isValidElement, useState, useId } from 'react';
import type { ReactNode, Ref } from 'react';
import { Form } from 'react-bootstrap';
import type { FormSelectProps } from 'react-bootstrap/FormSelect';
function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child),
    )
    .join('');
}
export function SearchableSelect({
  children,
  ...props
}: FormSelectProps & { ref?: Ref<HTMLSelectElement> }) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const options = Children.toArray(children);
  const filtered = options.filter((option) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(option)) return true;
    return (
      !option.props.value ||
      String(option.props.value) === String(props.value) ||
      text(option.props.children).toLocaleLowerCase().includes(search.toLocaleLowerCase())
    );
  });
  return (
    <>
      {options.length > 10 && (
        <Form.Control
          id={searchId}
          type="search"
          className="mb-2"
          aria-label={`Buscar opciones de ${props.name || 'selección'}`}
          placeholder="Buscar opciones..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={props.disabled}
        />
      )}
      <Form.Select {...props}>{filtered}</Form.Select>
    </>
  );
}
