import { Button } from 'react-bootstrap';

interface TopHeaderProps {
  onToggleSidebar: () => void;
}

export function TopHeader({ onToggleSidebar }: TopHeaderProps) {
  return (
    <header
      className="position-fixed top-0 end-0 bg-white border-bottom px-3 px-md-4 d-flex align-items-center z-2 shadow-xs top-header"
      style={{ height: '64px' }}
    >
      <Button
        variant="light"
        className="d-md-none me-3 border-0"
        onClick={onToggleSidebar}
        aria-label="Abrir menú"
      >
        <i className="bi bi-list fs-3 text-secondary"></i>
      </Button>


    </header>
  );
}