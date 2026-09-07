import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { TopHeader } from '../shared/components/TopHeader';
import '../App.css';

export default function App() {
  return (
    <div className="min-vh-100 bg-light d-flex">
      {/* 1. Sidebar lateral izquierdo */}
      <Sidebar />

      {/* 2. Área principal desplazada */}
      <div className="flex-grow-1" style={{ marginLeft: '260px' }}>
        <TopHeader />

        <main className="p-4" style={{ marginTop: '64px' }}>
          <div className="container-fluid max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}