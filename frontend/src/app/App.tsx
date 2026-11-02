import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { TopHeader } from '../shared/components/TopHeader';
import { useAuth } from '../shared/hooks/useAuth';
import '../App.css';

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { currentUser } = useAuth();
  const vista = currentUser?.administrar
    ? 'Vista de administración'
    : currentUser?.operar ? 'Vista de operación' : 'Acceso al sistema';

  return (
    <div className="min-vh-100 d-flex bg-body-tertiary">
      <Sidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

      <div className="flex-grow-1 main-content d-flex flex-column">
        <TopHeader onToggleSidebar={() => setShowSidebar(true)} />

        <main className="flex-grow-1 p-3 p-md-4" style={{ marginTop: '64px' }}>
          <div className="container-fluid max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
        <footer className="saia-content-footer bg-body text-body-secondary">
          <span>SAIA · Sistema de gestión alimentaria</span>
          <span>{vista}</span>
        </footer>
      </div>
    </div>
  );
}
