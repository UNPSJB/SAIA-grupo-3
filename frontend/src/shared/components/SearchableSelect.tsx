import { Children, isValidElement, useCallback, useContext, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import FormContext from 'react-bootstrap/FormContext';
import type { FormSelectProps } from 'react-bootstrap/FormSelect';

interface Opcion {
  value: string;
  label: string;
  disabled: boolean;
}

function text(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child),
    )
    .join('');
}

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
}

function leerOpciones(children: ReactNode): Opcion[] {
  return Children.toArray(children).flatMap((option) => {
    if (
      !isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(option)
    ) {
      return [];
    }
    return [
      {
        value:
          option.props.value === undefined
            ? text(option.props.children)
            : String(option.props.value),
        label: text(option.props.children),
        disabled: Boolean(option.props.disabled),
      },
    ];
  });
}

function asignarRef<T>(ref: Ref<T> | undefined, valor: T | null) {
  if (typeof ref === 'function') ref(valor);
  else if (ref) (ref as { current: T | null }).current = valor;
}

const DESCRIPTOR_VALUE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

export function SearchableSelect({
  children,
  ref,
  id,
  className,
  size,
  isInvalid,
  isValid,
  disabled,
  required,
  value,
  bsPrefix,
  htmlSize,
  ...props
}: FormSelectProps & { ref?: Ref<HTMLSelectElement> }) {
  const { controlId } = useContext(FormContext);
  const idCampo = id ?? controlId ?? undefined;
  const idLista = useId();
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listaRef = useRef<HTMLUListElement | null>(null);
  const [valorDom, setValorDom] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState(-1);

  const opciones = leerOpciones(children);
  const opcionVacia = opciones.find((opcion) => opcion.value === '');
  const valorActual = value !== undefined && value !== null ? String(value) : valorDom;
  const seleccionada = opciones.find(
    (opcion) => opcion.value === valorActual && opcion.value !== '',
  );
  const elegibles = opciones.filter((opcion) => !(required && opcion.value === ''));
  const termino = normalizar(busqueda.trim());
  const visibles = termino
    ? elegibles.filter(
        (opcion) => opcion.value !== '' && normalizar(opcion.label).includes(termino),
      )
    : elegibles;

  const refSelect = useCallback(
    (elemento: HTMLSelectElement | null) => {
      selectRef.current = elemento;
      if (elemento && DESCRIPTOR_VALUE?.get && DESCRIPTOR_VALUE.set) {
        const { get, set } = DESCRIPTOR_VALUE;
        Object.defineProperty(elemento, 'value', {
          configurable: true,
          get() {
            return get.call(this);
          },
          set(nuevo: string) {
            set.call(this, nuevo);
            setValorDom(get.call(this));
          },
        });
        setValorDom(get.call(elemento));
      }
      asignarRef(ref, elemento);
    },
    [ref],
  );

  const abrir = () => {
    if (disabled || abierto) return;
    setBusqueda('');
    setActivo(
      Math.max(
        0,
        elegibles.findIndex((opcion) => opcion.value === valorActual),
      ),
    );
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
    setActivo(-1);
  };

  const mostrarActivo = (indice: number) => {
    setActivo(indice);
    const elementos = listaRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    elementos?.[indice]?.scrollIntoView({ block: 'nearest' });
  };

  const elegir = (opcion: Opcion) => {
    const select = selectRef.current;
    if (!select || opcion.disabled) return;
    select.value = opcion.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    cerrar();
  };

  const moverActivo = (paso: number) => {
    if (!abierto) {
      abrir();
      return;
    }
    if (visibles.length === 0) return;
    let indice = activo;
    for (let intentos = 0; intentos < visibles.length; intentos++) {
      indice = (indice + paso + visibles.length) % visibles.length;
      if (!visibles[indice].disabled) break;
    }
    mostrarActivo(indice);
  };

  const alPresionar = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      moverActivo(1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      moverActivo(-1);
    } else if (evento.key === 'Enter') {
      if (!abierto) return;
      evento.preventDefault();
      const opcion = visibles[activo];
      if (opcion) elegir(opcion);
    } else if (evento.key === 'Escape') {
      if (abierto) {
        evento.preventDefault();
        cerrar();
      }
    } else if (evento.key === 'Tab') {
      cerrar();
    }
  };

  const alSalir = (evento: FocusEvent<HTMLInputElement>) => {
    if (listaRef.current?.contains(evento.relatedTarget as Node | null)) return;
    cerrar();
    selectRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  };

  const textoVisible = abierto ? busqueda : (seleccionada?.label ?? '');
  const placeholder = abierto
    ? seleccionada?.label || 'Escribí para buscar...'
    : (opcionVacia?.label ?? 'Seleccioná una opción...');
  const claseTamanio = size === 'sm' ? ' form-select-sm' : size === 'lg' ? ' form-select-lg' : '';
  const claseEstado = isInvalid ? ' is-invalid' : isValid ? ' is-valid' : '';

  return (
    <div className={`position-relative${claseEstado}`}>
      <input
        ref={inputRef}
        id={idCampo}
        type="text"
        role="combobox"
        autoComplete="off"
        className={`${bsPrefix ?? 'form-select'}${claseTamanio}${claseEstado}${className ? ` ${className}` : ''}`}
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && activo >= 0 ? `${idLista}-${activo}` : undefined}
        aria-invalid={isInvalid || undefined}
        aria-required={required || undefined}
        aria-label={props['aria-label']}
        placeholder={placeholder}
        value={textoVisible}
        disabled={disabled}
        onClick={abrir}
        onFocus={(evento) => evento.target.select()}
        onChange={(evento) => {
          setBusqueda(evento.target.value);
          setActivo(0);
          setAbierto(true);
        }}
        onKeyDown={alPresionar}
        onBlur={alSalir}
      />
      {abierto && (
        <ul
          ref={listaRef}
          id={idLista}
          role="listbox"
          className="dropdown-menu show w-100 py-1 shadow-sm"
          style={{ maxHeight: 260, overflowY: 'auto' }}
        >
          {visibles.length === 0 ? (
            <li className="dropdown-item-text text-body-secondary small">Sin resultados</li>
          ) : (
            visibles.map((opcion, indice) => (
              <li
                key={`${opcion.value}-${indice}`}
                id={`${idLista}-${indice}`}
                role="option"
                aria-selected={opcion.value === valorActual}
                aria-disabled={opcion.disabled || undefined}
                className={`dropdown-item text-wrap${indice === activo ? ' active' : ''}${
                  opcion.disabled ? ' disabled' : ''
                }${opcion.value === '' ? ' text-body-secondary fst-italic' : ''}`}
                style={{ cursor: opcion.disabled ? 'default' : 'pointer' }}
                onMouseDown={(evento) => evento.preventDefault()}
                onMouseEnter={() => !opcion.disabled && setActivo(indice)}
                onClick={() => elegir(opcion)}
              >
                {opcion.label}
              </li>
            ))
          )}
        </ul>
      )}
      <select
        {...props}
        ref={refSelect}
        size={htmlSize}
        id={idCampo ? `${idCampo}-select` : undefined}
        value={value}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="visually-hidden"
        onFocus={() => inputRef.current?.focus()}
      >
        {children}
      </select>
    </div>
  );
}
