import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AppRouter } from './router';
import '../index.css';
import '../App.css';
import { aplicarTema, leerTema } from '../shared/libreria/tema';

aplicarTema(leerTema());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
