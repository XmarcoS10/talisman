import { useEffect, useState } from 'react';
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
import { setLang } from './i18n.ts';
import { settings } from './settings.ts';
import { LanguageGate } from './screens/LanguageGate.tsx';

installDiagnostics(); // gli errori non gestiti si tengono per la diagnostica

/** la lingua prima di tutto: alla prima apertura la si sceglie; cambiandola dalle Impostazioni si ridisegna tutto */
function Root() {
  const [lang, setLangState] = useState(settings().lang);
  useEffect(() => {
    const f = () => setLangState(settings().lang);
    window.addEventListener('talisman-lang', f);
    return () => window.removeEventListener('talisman-lang', f);
  }, []);
  if (!lang) return <LanguageGate onPick={(l) => { setLang(l); }} />;
  return <App lang={lang} />;
}

createRoot(document.getElementById('root')!).render(<Root />);
