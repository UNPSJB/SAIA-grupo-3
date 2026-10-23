export type Tema = 'light' | 'dark';

export function leerTema(): Tema {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.setAttribute('data-bs-theme', tema);
  try {
    localStorage.setItem('theme', tema);
  } catch {
    // El tema sigue funcionando aunque el navegador bloquee el almacenamiento.
  }
}
