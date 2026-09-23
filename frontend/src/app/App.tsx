import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../shared/components/Sidebar';
import { TopHeader } from '../shared/components/TopHeader';
import '../App.css';

export default function App() {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="min-vh-100 d-flex bg-body-tertiary">
      <Sidebar show={showSidebar} onClose={() => setShowSidebar(false)} />

      <div className="flex-grow-1 main-content">
        <TopHeader onToggleSidebar={() => setShowSidebar(true)} />

        <main className="p-3 p-md-4" style={{ marginTop: '64px' }}>
          <div className="container-fluid max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}