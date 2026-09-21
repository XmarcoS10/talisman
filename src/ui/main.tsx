import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
// caratteri impacchettati nel gioco (licenza OFL): funziona senza internet e non contatta nessuno all'avvio
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './app.css';
import { installDiagnostics } from './diag.ts';

installDiagnostics(); // gli errori non gestiti si tengono per la diagnostica

createRoot(document.getElementById('root')!).render(<App />);
