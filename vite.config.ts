import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Politica di sicurezza dei contenuti, solo nella build: la pagina carica solo i propri file (caratteri compresi) e
// non contatta niente fuori. In sviluppo Vite ha bisogno di script in linea, quindi lì non si mette.
const csp: Plugin = {
  name: 'talisman-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'" />`),
};

// base relativa: Electron carica dist/index.html da file://
export default defineConfig({ base: './', plugins: [react(), csp] });
