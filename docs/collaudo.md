# Collaudo di Tactic F.C. Manager (TFM 27)

Grazie di averci dato una mano. Non serve sapere niente di programmazione né di videogiochi manageriali: ci interessa
proprio sapere cosa capisce chi lo apre per la prima volta. **Non chiedere aiuto mentre giochi**: se ti blocchi,
scrivilo nel modulo in fondo. Un blocco che segnali vale più di una stagione finita.

Tempo richiesto: una stagione intera, di solito **3-5 ore** divise come vuoi. Il gioco salva da solo.

---

## 1. Installazione (Windows 10 o 11)

1. Scarica **`TFM27-Setup.exe`** dalla pagina
   [Download](https://xmarcos10.github.io/talisman/download.html) (circa 123 MB).
2. Aprilo con un doppio clic. Windows mostrerà quasi certamente una finestra blu:
   **«Windows ha protetto il PC»** (SmartScreen). Succede perché l'installer non è firmato: la firma costa un
   certificato che per un gioco gratuito in collaudo non abbiamo comprato. Il file è quello giusto se il codice
   SHA-256 scritto nella pagina Download coincide (in PowerShell: `Get-FileHash TFM27-Setup.exe`).
   - Clicca **«Ulteriori informazioni»**, poi **«Esegui comunque»**.
3. Scegli la cartella (va bene quella proposta) e installa. Non servono permessi di amministratore né internet: il
   gioco non si collega a niente.
4. Apri **Tactic F.C. Manager** dal menu Start.

Per disinstallare: Impostazioni di Windows → App → Tactic F.C. Manager → Disinstalla. I salvataggi restano in
`%APPDATA%\talisman` finché non cancelli la cartella.

---

## 2. Cosa fare

1. Crea una **nuova carriera** e scegli la squadra che vuoi.
2. Gioca **una stagione intera**, fino all'ultima giornata e al riepilogo di fine stagione.
3. Almeno **3 partite guardale dal vivo** sul campo 2D (anche a velocità alta); le altre simulale pure.
4. Per il resto fai quello che ti viene naturale: mercato, allenamento, tattica, conferenze stampa. Non ci sono
   cose obbligatorie oltre a queste.
5. Tieni un foglio o il telefono accanto: quando qualcosa non si capisce, ti annoia o ti diverte, scrivi due parole
   e il giorno di gioco (lo vedi in alto). Servono per il modulo.

---

## 3. Se qualcosa si rompe: la diagnostica

Se il gioco si blocca, dà un errore o fa qualcosa di strano:

1. Vai in **Impostazioni & Salvataggi** (barra a sinistra) → riquadro **«Manutenzione e diagnostica»**.
2. Premi **«Esporta diagnostica»** e salva il file (`talisman-diagnostica-….json`) dove vuoi.
3. Allegalo alla segnalazione. Contiene la versione del gioco, il sistema, gli ultimi errori e l'elenco dei
   salvataggi: **non** contiene la tua carriera né dati personali. Puoi aprirlo con il Blocco note per controllare.

Nello stesso riquadro trovi anche la **versione** del gioco: scrivila nella segnalazione.

Dove segnalare: [segnalazioni su GitHub](https://github.com/XmarcoS10/talisman/issues/new/choose) (serve un account
gratuito), oppure manda il modulo e il file a chi ti ha chiesto il collaudo.

---

## 4. Il modulo

Rispondi quando hai finito (o quando hai smesso: anche «ho smesso dopo 20 minuti perché…» è una risposta preziosa).
Frasi brevi vanno benissimo.

**Il gioco**

1. **Quanto hai giocato?** Ore circa, e fin dove sei arrivato (giornata, fine stagione, oltre).
2. **Dove ti sei bloccato?** Un momento in cui non sapevi cosa fare o come andare avanti.
3. **Quale schermata non hai capito?** Nome o descrizione, e cosa ti confondeva.
4. **Cosa ti ha divertito?** Il momento migliore.
5. **Cosa ti ha annoiato?** Cosa hai iniziato a saltare o a cliccare senza leggere.
6. **Cosa racconteresti a un amico** di questo gioco, in una frase?
7. **C'era qualcosa che ti aspettavi e non hai trovato?**
8. **Un numero o una notizia ti è sembrata assurda?** (Un prezzo, uno stipendio, un risultato, una storia.)
9. **Bug trovati**: cosa è successo, il giorno di gioco, e se hai esportato la diagnostica.
10. **Ci giocheresti una seconda stagione?** Perché sì o perché no.

**La partita**

11. **Capivi cosa stava succedendo in campo** senza leggere il testo?
12. **Le tue scelte tattiche si vedevano in campo?** Hai cambiato qualcosa e visto (o non visto) una differenza?
13. **Le partite le hai guardate o simulate, e perché?**

Grazie!
