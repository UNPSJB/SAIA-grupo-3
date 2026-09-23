import { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  // Leemos si el usuario ya tenía un tema guardado, o usamos 'light' por defecto
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Aplicamos el atributo a <html> cada vez que cambia el tema y lo guardamos
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', tema);
    localStorage.setItem('theme', tema);
  }, [tema]);

  const cambiarTema = () => {
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header
      className="position-fixed top-0 end-0 bg-body border-bottom px-3 px-md-4 d-flex align-items-center justify-content-between z-2 shadow-xs top-header"
      style={{ height: '64px' }}
    >
      <Button
        variant="light"
        className="d-md-none border-0"
        onClick={onToggleSidebar}
        aria-label="Abrir menú"
      >
        <i className="bi bi-list fs-3 text-secondary"></i>
      </Button>

      {/* Botón para alternar modo claro / oscuro */}
      <div className="ms-auto">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={cambiarTema}
          className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-none"
          title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <i className={`bi ${tema === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill'}`}></i>
          <span className="small fw-semibold">{tema === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </Button>
      </div>
    </header>
  );
}