import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
// caratteri impacchettati nel gioco (licenza OFL): funziona senza internet e non contatta nessuno all'avvio
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/space-grotesk/600.css';
import './app.css';
import { installDiagnostics } from './diag.ts';

installDiagnostics(); // gli errori non gestiti si tengono per la diagnostica

createRoot(document.getElementById('root')!).render(<App />);
