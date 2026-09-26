# Sito di Tactic F.C. Manager

Cinque pagine statiche (Home, Caratteristiche, Motore 2D, Download, Community), in italiano (`site/`) e in inglese
(`site/en/`) con il cambio di lingua a bandiere nella testata, sul modello dei disegni di Marco,
con la grafica del gioco (`docs/design/DESIGN.md`). Caratteri e immagini in questa cartella, nessuna chiamata esterna.

- **Online**: https://xmarcos10.github.io/talisman/ — lo pubblica `.github/workflows/pages.yml` a ogni push su `main`
  che tocca `site/`.
- **Le pagine si generano** con `python tools/site.py`: testata e piè di pagina sono lì una volta sola. Si modifica lo
  script, non gli `.html`. Lo stile è in `style.css`.
- **Nuovo installer**: aggiornare `VERSION`, `SHA` (`Get-FileHash release/TFM27-Setup.exe`) e `SIZE` in `tools/site.py`.
- **Testi**: ogni frase è scritta due volte, `x('italiano', 'english')`; lo script genera le due lingue in un giro.
- **Pulsante di download**: punta a `…/releases/latest/download/TFM27-Setup.exe`, cioè sempre all'ultima versione
  pubblicata su GitHub. L'installer ha un nome fisso apposta (`artifactName` in `package.json`).
- **Screenshot**: si rifanno dal gioco vero con
  `node tools/shots-world.ts tools/shots-save.json && pnpm build && npx electron tools/shots.cjs`
  (usa una cartella dati temporanea: i salvataggi veri non si toccano).
- **Clip** (`site/clips/`, nella pagina Motore): `pnpm build && npx electron tools/clips.cjs`. Partono mute e in loop
  solo quando arrivano sullo schermo, così la pagina non scarica 14 MB appena si apre.
- **Anteprima in locale**: `python -m http.server 5174 --directory site`.
