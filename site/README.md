# Sito di Tactic F.C. Manager

La pagina da cui si scarica il gioco. Statica: `index.html`, `style.css`, caratteri e immagini in questa cartella,
nessuna chiamata a servizi esterni.

- **Screenshot**: si rifanno dal gioco vero con
  `node tools/shots-world.ts tools/shots-save.json && pnpm build && npx electron tools/shots.cjs`
  (usa una cartella dati temporanea: i salvataggi veri non si toccano).
- **Pulsante di download**: punta a `…/releases/latest/download/TFM27-Setup.exe`, cioè sempre all'ultima versione
  pubblicata su GitHub. L'installer ha un nome fisso apposta (`artifactName` in `package.json`).
- **Anteprima in locale**: `python -m http.server 5174 --directory site`.
