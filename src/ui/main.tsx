import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './app.css';
import { installDiagnostics } from './diag.ts';

installDiagnostics(); // gli errori non gestiti si tengono per la diagnostica

createRoot(document.getElementById('root')!).render(<App />);
