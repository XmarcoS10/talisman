# Note di rilascio

## 0.13.2 — istruzioni individuali per fase

I salvataggi passano alla versione 34, senza cambiamenti per la tua squadra.

- **Istruzioni per il giocatore divise per fase**, come in FM26: in Tattica, selezionando un giocatore, trovi
  «Con palla» (tiro, ampiezza, inserimenti, resta dietro) e «Senza palla» (marcatura stretta e, nuova,
  **entrate decise**: vince più palloni ma fa più falli, come chi ha il tratto «Entra in scivolata»).
- **Tattica**: con un giocatore selezionato la tabella dei candidati non esce più di lato.

## 0.13.1 — le richieste nello Spogliatoio

- **Chi chiede di parlarti** (Spogliatoio) ora ha la risposta lì, come in FM: **prometti più spazio**, oppure
  **il posto deve guadagnarselo**. Il professionista capisce e si rimbocca le maniche; l'ambizioso che non è un
  professionista vuole giocare subito e la prende male; gli altri restano poco convinti. Anche qui un colloquio a
  settimana con lo stesso giocatore.

## 0.13.0 — i colloqui individuali

Le carriere della 0.12 si aprono senza cambiamenti.

- **Colloqui con un giocatore**, come in FM: nel profilo, scheda Dinamiche, puoi **lodare** o **criticare** il suo
  rendimento. Come la prende dipende da come sta giocando (la media degli ultimi tre voti) e dal carattere: lodare chi
  gioca bene lo convince, chi gioca male no; criticare chi gioca bene è ingiusto, chi regge male la pressione ci
  resta male, un professionista che sta giocando male la prende come uno stimolo. Il giocatore ti risponde, e morale e
  fiducia si muovono.
- Con lo stesso giocatore **un colloquio a settimana**, e le lodi rendono sempre meno a chi ha già piena fiducia in te.

## 0.12.2 — l'analista non anticipa i gol

- **Partita dal vivo**: nei salienti il motore calcola qualche secondo prima di quello che vedi, e l'analista leggeva
  il punteggio del motore: poteva dire «due gol di margine» o «abbiamo appena segnato» prima che il gol comparisse.
  Ora parla del punteggio che vedi.
- **Sito**: foto nuove, con l'interfaccia di adesso.

## 0.12.1 — la nuova carriera e le altre schermate

Ultima fase del nuovo aspetto: nuova carriera e schermate senza disegno di Stitch, provate a 1280×800.

- **Nuova carriera**: nel dossier la firma sta nella colonna a destra, sempre a vista, come nel disegno; «Scegli a
  sorpresa» pesca un club a caso; i passi 1 e 2 non sono più scritti due volte.
- **Barra laterale**: sta tutta nello schermo, anche Classifiche e Record.
- **Allenamento**: la familiarità mostra anche 3-2-5 e 5-4-1, e il riquadro in alto quella dei due moduli insieme se
  ne usi uno senza palla. Nei piani partita si scelgono anche i moduli di una fase sola.
- **Impostazioni**: un solo pulsante rosso per volta (Salva ora); le caselle di spunta hanno tutte la stessa misura.

## 0.12.0 — il vice parla alla squadra

Le carriere della 0.11.0 si aprono senza cambiamenti.

- **Il vice fa i discorsi** nelle partite giocate con «Solo il risultato»: prima della partita e alla fine, come
  quando in FM li deleghi. Sceglie il tono migliore per la rosa fra quelli che conosce: un vice scarso sa solo
  calmare e motivare, uno bravo sa anche lodare dopo una vittoria o mostrarsi deluso dopo una sconfitta. Nelle notizie
  trovi quali toni ha usato, nel profilo dei giocatori chi l'ha presa bene o male.
- **L'IA usa i ruoli senza palla**: gli allenatori pressing fanno pressare attaccanti e trequartisti, quelli da
  contropiede lasciano alto il centravanti come sbocco.

### Misure

Punti sopra le attese per stile (`tools/diag-coaches.ts`, 6 stagioni): la forbice fra lo stile migliore e il peggiore
scende da 8,3 a 7,2 punti (seme 42) e da 8,4 a 5,7 (seme 7). Carriere di 25 stagioni: correlazione forza-punti 0,81
(target 0,75-0,85).

## 0.11.0 — la tattica con e senza palla

Le carriere della 0.10.0 si aprono senza cambiamenti per la tua squadra: finché non scegli un modulo senza palla, si
gioca come prima. Le squadre dell'IA invece cambiano (vedi sotto).

- **Due moduli, come in Football Manager 26**: nella Tattica scegli il modulo **con palla** e quello **senza palla**.
  L'interruttore «Con palla / Senza palla» sopra il campo mostra le stesse undici schede nelle posizioni di ciascuna
  fase. A ogni cambio di possesso la squadra passa da una forma all'altra, e chi deve fare più strada per rientrare
  lascia spazio al contropiede.
- **Ruoli senza palla** per ogni giocatore: «Tiene la posizione», «Pressa» (si stanca di più), «Copre», «Resta alto»
  (sbocco del contropiede, non per i difensori). Senza sceglierlo resta quello di sempre.
- **Istruzioni di squadra divise per fase**: con palla (ritmo, ampiezza, verticalità), in transizione (dopo la palla
  persa), senza palla (pressing, linea difensiva).
- **Due moduli nuovi**: 3-2-5 (con palla) e 5-4-1 (senza palla).
- **Dal vivo**: nelle regolazioni rapide si cambia il modulo senza palla, e sul campo 2D si vede la squadra cambiare
  forma.
- **Anche l'IA** usa i due moduli: gli allenatori difensivi e da contropiede difendono in 4-4-2 o 5-3-2, quelli
  pressing dal 4-2-3-1 pressano col 4-4-2.

### Misure

Nessuna coppia di moduli stacca il modulo semplice di più di 0,10 punti a partita; nelle carriere di 25 stagioni la
correlazione fra forza e punti è 0,75, dentro il target.

## 0.10.0 — i tratti del giocatore

Le carriere della 0.9.0 si aprono e ogni giocatore trova i suoi tratti. Le partite cambiano: i tratti contano in campo.

- **Tratti come in Football Manager**: «Tenta spesso tiri da fuori», «Porta spesso palla», «Tenta spesso il passaggio
  filtrante», «Gioca palloni semplici», «Crossa appena può», «Si inserisce in area», «Resta sempre dietro», «Entra spesso
  in scivolata» e, per i portieri, «Esce spesso dai pali». Si vedono nel profilo; dei giocatori degli altri club solo
  quando gli osservatori li conoscono.
- **Contano in partita**: chi ha un tratto decide diversamente (tira di più da fuori, cerca il dribbling, si inserisce,
  contrasta di più e fa più falli...).
- **Si insegnano**: dal profilo di un tuo giocatore «Insegna un tratto», oppure «Disimpara». Servono settimane: i
  giovani e i professionisti imparano prima, il vice bravo aiuta, chi ha il morale a terra non ascolta. Due tratti
  opposti non stanno insieme. Quando ha imparato arriva la notizia.
- Con i tratti le partite hanno un po' più di tiri e gol (2,59 a partita, prima 2,46), sempre nei target.

## 0.9.0 — lo staff

Le carriere della 0.8.0 si aprono senza cambiamenti e trovano subito uno staff medio.

- **Staff nuovo nella sezione Club**: vice allenatore, preparatore atletico e medico, ognuno con nome, bravura da 1
  a 20 e stipendio. A bravura 10 non cambiano nulla; sopra aiutano, sotto pesano.
- **Il medico** accorcia (o allunga) le guarigioni fino al 25%. **Il preparatore** cambia il rischio di infortuni in
  allenamento fino al 25%. **Il vice** sposta il morale verso cui tende lo spogliatoio di qualche punto.
- **Candidati da assumere**: ogni ruolo ha liberi con l'effetto già scritto accanto («Guarigioni più rapide del 15%»).
  Assumendone uno, chi c'era torna libero. A fine stagione arrivano candidati nuovi.
- Gli stipendi dello staff entrano nel monte ingaggi (e quindi nel tetto del fair play finanziario).

### Limiti noti

- Gli altri club hanno uno staff medio che non si vede: le loro partite non cambiano.
- Il vice non fa ancora i discorsi nelle partite giocate con «Solo il risultato».

## 0.8.0 — i discorsi alla squadra

Le carriere della 0.7.0 si aprono senza cambiamenti; le partite giocate senza guardarle sono le stesse.

- **Discorsi alla squadra** nelle partite guardate dal vivo: prima del calcio d'inizio, all'intervallo e a fine partita
  scegli fra sei toni (calma, motivare, pretendere di più, scuoterli, lodare, delusione). Subito vedi quanti l'hanno
  presa bene, quanti indifferenti e chi l'ha presa male.
- **Chi reagisce come** dipende dal carattere e dal punteggio: lodare chi sta perdendo non convince, pretendere di più
  pesa su chi regge male la pressione, la delusione scuote i professionisti solo quando si perde.
- **Prima e all'intervallo** il discorso cambia la resa in campo per il resto della partita (quanto un richiamo da
  bordo campo). **A fine partita** resta sul morale e sulla fiducia in te, e nel profilo del giocatore c'è scritto
  perché.
- **Partita dal vivo sul disegno nuovo**: parte alta su due righe e campo più grande, titolari con la barra
  dell'energia, panchina intera, stadio e meteo sopra il campo. Tattica e Mercato stanno in una finestra da 1280×800
  (i filtri del mercato diventano una barra sopra la tabella).

### Limiti noti

- Le squadre dell'IA non fanno discorsi, e con «Solo il risultato» non se ne fanno.

## 0.7.0 — la nuova interfaccia

Le carriere della 0.6.x si aprono senza cambiamenti; la partita è la stessa. È la prima parte del rifacimento
dell'interfaccia (`docs/design/ui-v2-piano.md`): i disegni fatti con Stitch nella struttura di Openfoot Manager.

- **Cornice nuova.** Barra laterale con l'allenatore e il suo club, le voci divise in Club e Mondo, e si riduce alle
  sole icone. In alto il titolo della schermata con la data, la ricerca, il tema, la cassa e **«Salva»**.
- **«Continua» ha un menu**: scegli se guardare le tue partite **dal vivo** o avere **solo il risultato**. Nel giorno
  della partita il pulsante dice cosa farà; lo Spazio fa lo stesso.
- **La Scrivania si personalizza.** Tre layout pronti (Allenatore, Direttore sportivo, Essenziale) o il tuo: con
  «Personalizza scrivania» sposti i riquadri, scegli la taglia, li togli e ne aggiungi dalla galleria. Riquadri nuovi:
  prossime 5 partite, infermeria e squalificati, contratti in scadenza, fiducia di dirigenza, tifosi e squadra.
- **Colori e caratteri nuovi**: rosso per i pulsanti e le scelte, verde per ciò che va bene; titoli condensati. Anche il
  tema chiaro.

Le altre schermate hanno già la cornice e i colori nuovi; il loro interno verrà rifatto nelle prossime versioni.

## 0.6.1 — il collaudo

Le carriere della 0.6.0 si aprono senza cambiamenti; la partita è la stessa. Correzioni trovate giocando una stagione
intera come un giocatore nuovo (`docs/notes/collaudo-2026-09-28.md`).

- **I decimali hanno la virgola** in italiano (età media, carico di allenamento, voti, xG, percentuali).
- **«Avanza» non fa più clic a vuoto**: i giorni in cui la tua squadra non gioca passano da soli fino alla tua prossima
  partita o alla fine della stagione. Ci si ferma se arriva un'offerta o una conferenza stampa.
- **Il report sulla prima partita** mostra già l'allenatore avversario, e l'uomo pericoloso non ha più numeri inventati.
- **«Salta al finale»** lascia i cambi al vice, e **l'analista** a fine partita commenta invece di suggerire cambi.
- Dopo una partita di coppa il resoconto dice «Fine partita» e non «Finale»; si chiude anche con Esc.
- Le **richieste di rinnovo** degli agenti portano al giocatore; le Finanze spiegano perché la cassa scende fino a maggio.
- Il riassunto di fine stagione dice chi ha vinto la coppa e chi è il tuo capocannoniere.
- Ogni club ha una sigla sua (nei mondi nuovi); il suggerimento della partita dal vivo non copre più il campo.
- Piccoli testi: «una giornata» di squalifica, «esonero sotto il 18%», il vivaio con la quota vera di stranieri.

## 0.6.0 — la costruzione

Le carriere della 0.5.x si aprono senza cambiamenti.

- **La squadra più forte fa girare palla.** Chi palleggia meglio dell'avversario costruisce con pazienza nella sua metà
  campo e sulla trequarti, e attacca come prima vicino all'area; a palla appena recuperata riparte subito. Il possesso
  della squadra nettamente più forte passa dal 43% a circa il 51%, e la precisione dei passaggi sale all'85%.
- **La difesa si disordina.** Un cambio di gioco riuscito sposta il blocco avversario per qualche secondo: marcature,
  linee di passaggio e corpi davanti al tiro contano meno. Succede solo se chi passa palleggia meglio di quanto
  l'altra difesa sappia posizionarsi (Passaggi e Visione contro Posizionamento e Concentrazione).

### Limiti noti

- Fra squadre vicine di forza i risultati sono un po' più casuali di prima nelle carriere lunghe.
- Il possesso della squadra più forte resta sotto quello della Serie A vera (51% contro circa 60%), e i capocannonieri
  segnano ancora troppo (circa 50 gol).

## 0.5.2 — il gioco si spiega

Le carriere della 0.5.1 si aprono senza cambiamenti; la partita è la stessa della 0.5.1.

- **La guida della prima partita ha sei passi**: il nuovo è «Studia l'avversario», il report sulla prossima partita
  nel Calendario (allenatore avversario e suo stile, arbitro, meteo). Si rifà dalle Impostazioni.
- **Suggerimenti nuovi** per Classifiche, Calendario e Record, e aggiornati quelli di Scrivania, Tattica, Mercato e
  partita dal vivo con le novità delle ultime versioni (istruzioni individuali, piani partita, radiocronaca, CSV).

## 0.5.1 — il movimento senza palla

Le carriere della 0.5.0 si aprono senza cambiamenti.

- **Si inseriscono anche i centrocampisti.** Mezzali, trequartisti ed esterni attaccano l'area dalla trequarti, e chi
  li marca deve seguirli: se perde il duello (Movimento senza palla e velocità contro Posizionamento e Anticipo)
  l'attaccante arriva libero. Il centravanti non tira più quasi tutto lui: i suoi tiri scendono dall'82% a circa il 63%.
- **I difensori davanti al tiro contano.** Più corpi fra la palla e la porta vogliono dire un tiro più difficile e più
  spesso murato; chi marca bene conta più di chi c'è e basta. Chiudersi in difesa ha un senso.
- **Si tira da fuori area**, soprattutto chi ha un buon tiro da lontano (prima quasi mai, ora circa un tiro su cinque).
- **In costruzione si sbaglia meno** (precisione dei passaggi dal 77% all'82%, come nel calcio vero), e il centravanti
  avversario non vive più di palloni regalati.
- La palla bassa dal fondo va a chi arriva da dietro, non sempre al più forte di testa. Più gol in contropiede.
- La pioggia pesa di più sui passaggi.

### Limiti noti

- I capocannonieri segnano ancora troppo (45-57 gol nelle prove) e la squadra più forte non tiene abbastanza la palla.
- Alcuni mondi segnano un po' meno di altri (fra 2,3 e 2,7 gol a partita).

## 0.5.0 — il mondo intorno

Contiene anche la 0.3.0 e la 0.4.0, che non sono uscite da sole. Le carriere della 0.2.x si aprono da sole (passano al
formato 30).

- **Allenatori dell'IA**: ogni club ha un allenatore con uno stile (equilibrato, offensivo, difensivo, pressing,
  possesso, contropiede) che decide modulo, istruzioni e mentalità. Chi va troppo sotto il blasone del club viene
  esonerato, con la notizia. Si vedono nella scheda del club e nel report sull'avversario.
- **Istruzioni riequilibrate**: pressing alto e gioco verticale vincevano quasi da soli, il palleggio perdeva. Adesso
  ogni istruzione ha i suoi pro e contro.
- **Radiocronaca** di ogni partita giocata, dal resoconto o cliccando i risultati (anche nel Calendario).
- **Arbitri** con la loro severità, che si vede prima della partita: quello severo tira fuori più cartellini.
- **Meteo e terreno**: caldo, pioggia, vento, temporale e freddo secondo il mese, con campo pesante. Cambiano un po' la
  partita, si vedono nelle previsioni, nel resoconto e nel 2D.
- **Database della community**: dalla nuova carriera si carica un file col mondo intero (campionati, club, stemmi,
  giocatori). Il formato è in `docs/database.md`; il gioco non contiene dati reali e non si collega a internet.
- **Record e storia**: una schermata nuova con i record del tuo club, la tua carriera stagione per stagione, le
  carriere dei giocatori e l'albo d'oro. I record si vedono anche nella scheda degli altri club.
- **Esportazione CSV** da Rosa, Classifiche, Finanze, Record e Mercato: si apre in Excel con accenti e decimali giusti.
- **Tema chiaro**: nelle Impostazioni, Scuro, Chiaro o Come il sistema. Il campo resta verde scuro.
- **Stranieri come nella Serie A vera**: circa 60% in A, 35% in B, 15% in C; i vivai pescano di conseguenza.
- Le nazionali convocano per reparto (3 portieri, 8 difensori, 7 centrocampisti, 5 attaccanti).
- La rosa degli altri club si ordina per le stime degli osservatori, non per i valori veri.
- Il grafico della cassa non mostra più dieci mesi piatti a inizio stagione.

### Limiti noti

- Il centravanti tira troppo e i capocannonieri segnano troppo (40-70 gol); la squadra più forte non tiene abbastanza
  la palla. Serve il movimento senza palla, che è il prossimo lavoro sul motore.

## 0.2.1 — le nazionali

Le carriere della 0.2.0 si aprono da sole (passano al formato 28).

- **Le partite delle nazionali si giocano davvero.** Prima erano un risultato calcolato da una formula: adesso passano
  dal motore del gioco, con formazione, cambi, cartellini e infortuni. Ogni gol ha un nome e un minuto, le presenze
  sono quelle vere e la fatica è quella dei minuti giocati. Nel Vivaio, sotto «I nostri in nazionale», c'è l'elenco
  delle ultime partite coi marcatori.
- Le partite delle nazionali restano fuori dalle statistiche di campionato, come prima.

## 0.2.0 — la partita

Le carriere della 0.1.x si aprono: passano da sole al formato 27. Le storie scritte prima restano in italiano, quelle
nuove si scrivono nella lingua che scegli.

- **La partita in 2D, rifatta.**
  - Tre visioni: **Salienti** (4-7 minuti con le azioni che contano), **Estesa** (anche pressing e ripartenze) e
    **Completa**.
  - Tre telecamere: campo intero, segue la palla, ravvicinata.
  - **Replay** al rallentatore dei gol e delle grandi occasioni.
  - Ogni momento dell'azione ha la sua animazione: dribbling, contrasto, colpo di testa, parata, uscita, respinta, fuorigioco.
  - **Sovrapposizioni tattiche** sul campo: linea e baricentro, rete dei passaggi, zone calde, zone di pressing.
    Quando cambi un'istruzione, la forma di prima resta tratteggiata.
  - Il nome sopra chi ha la palla, l'ombra della palla alta e chi sta pressando. Le maglie non si confondono.
  - Un racconto più vivo, con 22 tipi di evento e cinque frasi ciascuno. Il tabellino arriva all'intervallo e alla fine.
  - La folla reagisce.
  - La partita scorre fluida anche su un portatile lento.
- **Un motore della partita più ricco**:
  - dribbling e uno contro uno;
  - cross alti e bassi, con il duello aereo;
  - il portiere che para, respinge ed esce;
  - piazzati con schemi (primo palo, secondo palo, corto, barriera) e battitori scelti;
  - transizioni (ripiegare, riaggredire, ripartire);
  - fatica vera.
  I numeri delle partite sono tarati su quelli dei campionati veri.
- **Istruzioni individuali** (tiro, ampiezza, inserimenti, restare dietro, marcare a uomo un ruolo) e **piani partita**:
  «se siamo sotto dal 70', mentalità offensiva e un attaccante in più». Il vice te li annuncia quando scattano.
- **Tre campionati**:
  - Serie C di contorno, da cui salgono e in cui scendono le squadre;
  - **playoff** per la terza promossa della Serie B e **playout** per non retrocedere.
- **I club possono fallire**: chi spende troppo va in amministrazione controllata, con penalizzazione in classifica.
  I club ricchi reinvestono, e la Serie A attira i migliori della B.
- **In inglese**: l'interfaccia, le storie e le conferenze stampa. La lingua si sceglie alla prima apertura e si cambia
  dalle Impostazioni.
- Mercato su una scala più realistica, finestra invernale a gennaio, stelle di abilità relative al tuo campionato.
- Ogni risposta in conferenza stampa ha il suo tipo. La scheda del giocatore mostra i tratti di personalità che spiccano.
- Il gioco non si blocca più mentre passa la giornata: il motore lavora in un thread a parte.

### Limiti noti

- L'installer non è firmato: Windows mostra l'avviso «editore sconosciuto».
- La versione Linux va costruita su Linux (`pnpm dist:linux`).
- Le partite delle nazionali non si guardano.
- La distanza fra Serie A e Serie B oscilla più del previsto nelle prime stagioni. Si assesta dopo 5-10 stagioni
  (`docs/balance/2026-09-26.md`).

## 0.13.2 — player instructions by phase (English)

Saves move to version 34, with no change for your team.

- **Player instructions split by phase**, as in FM26: in Tactics, selecting a player shows "In possession" (shooting,
  width, runs, stay back) and "Out of possession" (tight marking and, new, **tackle harder**: wins more balls but
  commits more fouls, like a player with the "Dives into tackles" trait).
- **Tactics**: with a player selected, the candidates table no longer overflows sideways.

## 0.13.1 — requests in the dressing room (English)

- **Players asking to talk to you** (Dressing room) now get their answer right there, as in FM: **promise more playing
  time**, or **they must earn their place**. A professional understands and gets to work; an ambitious player who is
  not a professional wants to play now and takes it badly; the others stay unconvinced. One talk a week with the
  same player here too.

## 0.13.0 — one-to-one talks (English)

Careers from 0.12 open unchanged.

- **One-to-one talks with a player**, as in FM: in the profile, Dynamics tab, you can **praise** or **criticise** their
  form. How they take it depends on how they are playing (the average of the last three ratings) and on their
  character: praising a player in form convinces them, praising one out of form does not; criticising a player in form
  is unfair, one who handles pressure badly takes it hard, a professional who is playing badly takes it as a spur.
  The player answers you, and morale and trust move.
- **One talk a week** with the same player, and praise gives less and less to those who already trust you fully.

## 0.12.2 — the analyst no longer gives goals away (English)

- **Live match**: in highlights the engine runs a few seconds ahead of what you see, and the analyst read the engine's
  score: it could say "two goals up" or "we've just scored" before the goal appeared. Now it talks about the score
  you see.
- **Website**: new screenshots, with the current interface.

## 0.12.1 — the new career and the other screens (English)

The last phase of the new look: the new career and the screens without a Stitch design, checked at 1280×800.

- **New career**: in the dossier the signing box sits in the right column, always in view, as in the design;
  "Surprise me" picks a random club; steps 1 and 2 are no longer shown twice.
- **Sidebar**: fits the screen, Tables and Records included.
- **Training**: familiarity also lists 3-2-5 and 5-4-1, and the top tile shows both formations together if you use
  an out-of-possession one. Match plans can pick single-phase formations too.
- **Settings**: only one red button at a time (Save now); all checkboxes are the same size.

## 0.12.0 — your assistant talks to the team (English)

Careers from 0.11.0 open unchanged.

- **Your assistant gives the team talks** in matches played with "Result only": before kick-off and at full time, as
  when you delegate them in FM. They pick the best tone for the squad among the ones they know: a poor assistant can
  only calm or motivate, a good one can also praise after a win or show disappointment after a defeat. The news says
  which tones were used, and player profiles say who took it well or badly.
- **The AI uses out-of-possession roles**: pressing managers have forwards and attacking midfielders press, counter-
  attacking managers leave the striker high as an outlet.

## 0.11.0 — in and out of possession tactics (English)

Careers from 0.10.0 open unchanged for your team: until you pick an out-of-possession formation, it plays as before.
AI teams do change (see below).

- **Two formations, as in Football Manager 26**: in Tactics you choose the **in-possession** and the
  **out-of-possession** formation. The "In possession / Out of possession" switch above the pitch shows the same eleven
  cards in each phase's positions. Every change of possession the team moves from one shape to the other, and players
  with further to run back leave room for the counter.
- **Out-of-possession roles** for every player: holds position, presses (tires more), covers, stays high (a counter
  outlet, not for defenders). If you don't choose one, nothing changes.
- **Team instructions split by phase**: in possession (tempo, width, directness), in transition (after losing the
  ball), out of possession (pressing, defensive line).
- **Two new formations**: 3-2-5 (in possession) and 5-4-1 (out of possession).
- **Live**: the quick settings let you change the out-of-possession formation, and the 2D pitch shows the team changing
  shape.
- **The AI uses both too**: defensive and counter-attacking managers defend in 4-4-2 or 5-3-2, pressing ones from a
  4-2-3-1 press in a 4-4-2.

### Measurements

No formation pair beats the single formation by more than 0.10 points per match; in 25-season careers the correlation
between strength and points is 0.75, within target.

## 0.10.0 — player traits (English)

Careers from 0.9.0 open and every player finds their traits. Matches change: traits count on the pitch.

- **Traits as in Football Manager**: tries long-range shots, runs with ball often, tries killer balls often, plays short
  simple passes, crosses early, gets into the opposition area, stays back at all times, dives into tackles and, for
  goalkeepers, rushes out of goal. They show in the profile; for other clubs' players only once scouts know them.
- **They count in matches**: a player with a trait decides differently (shoots more from distance, looks for the
  dribble, makes runs into the box, tackles more and fouls more...).
- **They can be taught**: from one of your players' profile, "Teach a trait" or "Unlearn". It takes weeks: young players
  and professionals learn faster, a good assistant helps, players with very low morale won't listen. Opposite traits
  can't be held together. News arrives when it's learned.
- With traits matches have slightly more shots and goals (2.59 per match, 2.46 before), within targets.

## 0.9.0 — the staff (English)

Careers from 0.8.0 open unchanged and find an average staff straight away.

- **New Staff screen in the Club section**: assistant manager, fitness coach and doctor, each with a name, a skill
  from 1 to 20 and a wage. At skill 10 they change nothing; above they help, below they hurt.
- **The doctor** shortens (or lengthens) recoveries by up to 25%. **The fitness coach** changes the risk of training
  injuries by up to 25%. **The assistant** shifts the morale the dressing room drifts towards by a few points.
- **Candidates to hire**: every role has free staff with their effect written next to them. Hiring one makes the
  current one free. New candidates arrive at the end of each season.
- Staff wages count towards the wage bill (and so towards the financial fair play cap).

### Known limits

- Other clubs have an unseen average staff: their matches don't change.
- The assistant doesn't give team talks yet in "Result only" matches.

## 0.8.0 — team talks (English)

Careers from 0.7.0 open unchanged; matches you don't watch play the same.

- **Team talks** in matches watched live: before kick-off, at half time and at full time choose one of six tones
  (calm, motivate, demand more, fire them up, praise, disappointment). You see right away how many took it well, how
  many were indifferent and who took it badly.
- **Who reacts how** depends on character and score: praising a losing side doesn't convince, demanding more weighs on
  those who handle pressure badly, disappointment shakes professionals only when you're losing.
- **Before the match and at half time** the talk changes performance for the rest of the match (as much as a touchline
  shout). **At full time** it stays on morale and their trust in you, and the player profile says why.
- **Live match on the new design**: two-row top area and a bigger pitch, starters with energy bars, the whole bench,
  stadium and weather above the pitch. Tactics and Transfers fit a 1280×800 window (transfer filters become a bar
  above the table).

### Known limits

- AI teams don't give team talks, and "Result only" matches have none.

## 0.7.0 — the new interface (English)

Careers from 0.6.x open unchanged; matches play the same. This is the first part of the interface redesign: the Stitch
designs in the structure of Openfoot Manager.

- **New frame.** A sidebar with the manager and their club, items grouped into Club and World, and it can shrink to
  icons only. At the top, the screen title with the date, search, theme, cash and **Save**.
- **Continue has a menu**: choose whether to watch your matches **live** or get the **result only**. On match day the
  button says what it will do; the space bar does the same.
- **The desk can be customised.** Three ready layouts (Manager, Director of football, Essential) or your own: with
  "Customise desk" you move tiles, pick their size, remove them and add more from the gallery. New tiles: next 5
  matches, injuries and bans, expiring contracts, trust of board, fans and squad.
- **New colours and fonts**: red for buttons and choices, green for what is going well; condensed headings. The light
  theme too.

The other screens already have the new frame and colours; their insides will be redone in the next versions.

## 0.6.1 — the playtest (English)

Careers from 0.6.0 open unchanged; matches play the same. Fixes found by playing a full season as a new player
(`docs/notes/collaudo-2026-09-28.md`).

- **Decimals follow the language** (average age, training load, ratings, xG, percentages).
- **No more empty clicks on "Continue"**: days when your team doesn't play go by on their own until your next match or
  the end of the season. It stops if an offer or a press conference comes in.
- **The report on the first match** already shows the opposing manager, and the danger man no longer has made-up numbers.
- **"Skip to the end"** lets the assistant make the substitutions, and at full time **the analyst** comments instead of
  suggesting changes.
- Cup match reports say "Full time" rather than "Final"; they also close with Esc.
- Agents' **renewal requests** take you to the player; the Finances screen explains why cash goes down until May.
- The end-of-season summary shows the cup winner and your top scorer.
- Every club has its own short code (in new worlds); the live-match hint no longer covers the pitch.
- Small texts: a one-match ban, "sacked below 18%", the academy's real share of foreign players.

## 0.6.0 — the build-up (English)

Careers from 0.5.x open unchanged.

- **The stronger side keeps the ball moving.** Whoever passes better than the opponent builds patiently in their own
  half and midfield, and attacks as before near the box; right after winning the ball back they go straight away.
  The clearly stronger side's possession rises from 43% to about 51%, and pass accuracy to 85%.
- **Defences get pulled apart.** A successful switch of play shifts the opposing block for a few seconds: marking,
  passing lanes and bodies in front of the shot count for less. It only happens if the passer is better than the
  defence is at positioning (Passing and Vision against Positioning and Concentration).

### Known limits

- Between teams of similar strength, results over long careers are a little more random than before.
- The stronger side's possession is still below real Serie A (51% against about 60%), and top scorers still score too
  many (about 50 goals).

## 0.5.2 — the game explains itself (English)

Careers from 0.5.1 open unchanged; matches play exactly as in 0.5.1.

- **The first-match guide has six steps**: the new one is "Study the opponent", the report on the next match in
  Fixtures (opposing manager and style, referee, weather). You can restart it from Settings.
- **New hints** for Tables, Fixtures and Records, and updated ones for the Desk, Tactics, the Market and the live
  match, covering what's new in recent versions (player instructions, match plans, radio commentary, CSV).

## 0.5.1 — off-the-ball movement (English)

Careers from 0.5.0 open unchanged.

- **Midfielders make runs too.** Box-to-box and attacking midfielders and wingers attack the box, and their markers
  must follow: lose the duel (Off the Ball and pace against Positioning and Anticipation) and the runner arrives free.
  The centre-forward no longer takes almost every shot: the share falls from 82% to about 63%.
- **Defenders in front of the shot matter.** More bodies between ball and goal mean a harder shot, blocked more often;
  good markers count more than bodies. Sitting deep now makes sense.
- **Shots from outside the box**, mostly by players with good long shots (almost none before, now about one in five).
- **Fewer mistakes in the build-up** (pass accuracy from 77% to 82%, as in real football), so opposing strikers no
  longer live off gifted balls.
- Cut-backs go to whoever arrives from behind, not always to the best header. More counter-attack goals.
- Rain weighs more on passing.

### Known limits

- Top scorers still score too many (45-57 goals in tests) and the stronger side doesn't keep the ball enough.
- Some worlds score a little less than others (between 2.3 and 2.7 goals per match).

## 0.5.0 — the world around you (English)

Also contains 0.3.0 and 0.4.0, which were not released on their own. Careers from 0.2.x open on their own (they move to
save format 30).

- **AI managers**: every club has a manager with a style (balanced, attacking, defensive, pressing, possession,
  counter-attack) that picks formation, instructions and mentality. Those who fall too far below the club's standing
  get sacked, with a news item. They show on club pages and in the opponent report.
- **Instructions rebalanced**: high pressing and direct play almost won on their own, short passing lost. Now every
  instruction has its pros and cons.
- **Radio commentary** for every match played, from the match report or by clicking results (Fixtures too).
- **Referees** with their own strictness, shown before the match: a strict one shows more cards.
- **Weather and pitch**: heat, rain, wind, storms and cold by month, with heavy pitches. They change the match a little
  and show in the forecast, the match report and the 2D view.
- **Community database**: a new career can load a file with a whole world (leagues, clubs, crests, players). The format
  is in `docs/database.md`; the game ships no real data and never goes online.
- **Records and history**: a new screen with your club's records, your career season by season, the players' careers
  and the roll of honour. Records also show on other clubs' pages.
- **CSV export** from Squad, Tables, Finances, Records and Transfers: it opens in Excel with the right accents and decimals.
- **Light theme**: in Settings, Dark, Light or Follow system. The pitch stays dark green.
- **Foreign players like the real Serie A**: about 60% in A, 35% in B, 15% in C; academies recruit accordingly.
- National teams call up by position (3 goalkeepers, 8 defenders, 7 midfielders, 5 forwards).
- Other clubs' squads sort by the scouts' estimates, not by true values.
- The cash chart no longer shows ten flat months at the start of a season.

### Known limits

- Centre-forwards shoot too much and top scorers score too many (40-70 goals); the stronger side doesn't keep the ball
  enough. It needs off-the-ball movement, the next piece of work on the engine.

## 0.2.1 — the national teams (English)

Careers from 0.2.0 open on their own (they move to save format 28).

- **International matches are actually played.** They used to be a formula: now they go through the match engine, with
  line-ups, substitutions, cards and injuries. Every goal has a name and a minute, caps are real appearances, and the
  fatigue is the one from the minutes played. The Academy screen lists the latest matches with their scorers.
- International matches still stay out of league statistics.

## 0.2.0 — the match (English)

Careers from 0.1.x open fine: they move to save format 27 on their own. Stories written before stay in Italian. New
ones are written in the language you choose.

- **The 2D match, rebuilt.**
  - Three views: **Highlights** (4–7 minutes of the moves that matter), **Extended** (pressing and counter-attacks
    too) and **Full**.
  - Three cameras: whole pitch, follow the ball, close.
  - Slow-motion **replays** of goals and big chances.
  - Every moment of a move has its own animation: dribble, tackle, header, save, keeper coming out, parry, offside.
  - **Tactical overlays** on the pitch: line and shape, passing network, heatmap, pressing zones. When you change an
    instruction, the old shape stays dashed.
  - The name above the ball carrier, a shadow under the high ball, and who is pressing. Kits never clash.
  - Livelier commentary, with 22 kinds of event and five lines each. A match sheet at half-time and full-time.
  - The crowd reacts.
  - The match runs smoothly even on a slow laptop.
- **A richer match engine**:
  - dribbles and one-on-ones;
  - high and low crosses, with aerial duels;
  - a goalkeeper who saves, parries and comes out;
  - set-piece routines (near post, far post, short, wall) and chosen takers;
  - transitions (drop back, counter-press, break);
  - real fatigue.
  Match numbers are tuned against real leagues.
- **Player instructions** (shooting, width, forward runs, stay back, man-mark a role) and **match plans**: "if we're
  behind from the 70th minute, attacking mentality and an extra striker". Your assistant tells you when they kick in.
- **Three leagues**:
  - a background Serie C, where teams come up from and go down to;
  - **play-offs** for the third promotion spot in Serie B, and a **play-out** to avoid relegation.
- **Clubs can go bust**: clubs that overspend go into administration, with a points deduction. Rich clubs reinvest,
  and Serie A pulls the best players out of Serie B.
- **In English**: the interface, the stories and the press conferences. You choose the language at first launch and
  can change it in Settings.
- A more realistic transfer market scale, a January winter window, star ratings relative to your league.
- Every press conference answer has its own type. The player profile shows the personality traits that stand out.
- The game no longer freezes while a matchday is played: the engine runs on a separate thread.

### Known limits

- The installer isn't signed: Windows shows an "unknown publisher" warning.
- The Linux version has to be built on Linux (`pnpm dist:linux`).
- National team matches can't be watched.
- The gap between Serie A and Serie B swings more than planned in the first seasons. It settles after 5–10 seasons.

## 0.1.1 — per il collaudo esterno

La versione da dare ai tester (istruzioni e modulo in `docs/collaudo.md`). I salvataggi della 0.1.0 si aprono:
passano al formato 20.

- **Offerte per i tuoi giocatori**: nelle finestre di mercato gli altri club ti fanno offerte, e decidi tu dalla
  Scrivania: accetti, rifiuti o chiedi di più. Se un giocatore sognava quel club e gli dici di no, se lo ricorda.
- **Mercato dell'IA più vivo**: i club grandi riescono a comprare i titolari dei piccoli, e il campionato non si
  appiattisce dopo qualche stagione.
- **Stemmi** tutti diversi (8 scudi, 12 partizioni, 10 simboli), **maglie** con 15 disegni e seconda maglia (in partita
  le squadre non si confondono più), **volti** dei giocatori secondo nazionalità, età e altezza.
- **Grafica generata**: sfondi delle schermate, illustrazioni delle storie e grana dell'erba sul campo 2D.
- Modelli di segnalazione su GitHub per bug e impressioni.

## 0.1.0 — Tactic F.C. Manager (TFM 27)

Il gioco cambia nome (prima era Talisman) e faccia: tutte le schermate rifatte sui disegni di Marco. I salvataggi di
prima si ritrovano. Novità di gioco:

- **Coppa nazionale** a eliminazione diretta, con rigori, premi e albo d'oro; **amichevoli estive**.
- **Campionato Primavera** del vivaio e anteprima della prossima annata.
- **Filosofia dell'allenatore** da scegliere a inizio carriera: gestore, tattico o scopritore di talenti.
- **Indicazioni dalla panchina** in partita: incoraggia, chiedi di più, calma.
- Finanze con proiezione di fine stagione e cassa mese per mese; richiesta alla dirigenza per allargare lo staff
  osservatori; classifiche casa/trasferta/forma/xG; report sull'avversario; esportazione del calendario.
- **5 slot** con nome e tempo di gioco, valuta e formato data a scelta, pausa sulle notizie importanti.

### Prima versione di collaudo

La prima versione da far provare a persone che non hanno scritto il gioco. Obiettivo del collaudo (GUIDA §9, F9):
tre tester esterni completano una stagione senza chiedere aiuto.

### Cosa c'è

- Installer per Windows (`TFM27-Setup.exe`, 113 MB): si installa nella cartella dell'utente, senza
  permessi di amministratore; aggiornamento automatico spento. Funziona senza internet: i caratteri sono nel gioco.

- Due campionati inventati, Serie A e Serie B, venti squadre ciascuno, promozioni e retrocessioni.
- Partita dal vivo in 2D con panchina, pausa tattica, analista; oppure simulata all'istante.
- Tattica con cinque moduli e i ruoli per ogni posizione; allenamento a dodici sedute settimanali.
- Spogliatoio: grafo dei rapporti, leader, faide, morale contagioso, promesse.
- Mercato con trattative, agenti, contratti, prestiti, parametro zero; osservatori e stime al posto dei valori veri.
- Finanze per cassa con fair play finanziario; dirigenza con obiettivo rinegoziabile ed esonero.
- Vivaio con annate estive; nazionali con pause, Europeo e Mondiale.
- Quaranta tipi di storie e le conferenze stampa che ne nascono.
- Suggerimenti alla prima apertura di ogni schermata e una prima partita guidata.
- Salvataggi su file, registro degli errori e diagnostica esportabile.

### Limiti noti

- **L'installer non è firmato**: Windows mostrerà l'avviso «editore sconosciuto» (SmartScreen). Firmarlo richiede un
  certificato di firma del codice, che si compra; per il collaudo basta cliccare «Ulteriori informazioni → Esegui comunque».
- **La versione Linux (AppImage)** è configurata ma va costruita su Linux (`pnpm dist:linux`): da Windows non si può.
- Le partite delle nazionali non si guardano: si calcolano con un modello semplificato.
- L'intelligenza artificiale non fa offerte per i giocatori dell'utente (manca la schermata per accettarle).
- Il mercato dell'IA è prudente: i club accumulano cassa e le bancarotte, possibili come regola, non succedono.
- La partita in 2D è leggibile ma essenziale: duelli, parate e piazzati non hanno ancora una rappresentazione propria.
- Una simulazione di 10.000 partite richiede circa 47 secondi, oltre l'obiettivo di 20: non si nota giocando.

### Per chi aggiorna da versioni di sviluppo

I salvataggi vecchi si aprono: passano dalle migrazioni fino al formato 14. Nell'app desktop, alla prima apertura, gli
slot vengono copiati dall'archivio del browser a file veri; la copia vecchia resta come riserva.
