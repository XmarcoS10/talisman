import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base relativa: Electron carica dist/index.html da file://
export default defineConfig({ base: './', plugins: [react()] });
