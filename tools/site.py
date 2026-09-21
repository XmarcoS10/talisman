# Genera le 5 pagine del sito con la stessa testata e lo stesso piè di pagina.
# Uso: python tools/site.py (riscrive le pagine di site/; lo stile è in site/style.css)
import io, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
REPO = 'https://github.com/XmarcoS10/talisman'
DL = REPO + '/releases/latest/download/TFM27-Setup.exe'
SHA = '963992952d33ab9cdf85bd1ce01d0c229fc4f1210eb3f413a705896347ccdb80'

# icone (tracciati di lucide, licenza ISC)
I = {
 'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 'route': '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
 'news': '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
 'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'sprout': '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
 'coins': '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
 'landmark': '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
 'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
 'git': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
 'pause': '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
 'mega': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 'chart': '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
 'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
 'wifioff': '<path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76"/><path d="m2 2 20 20"/>',
 'save': '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
 'eyeoff': '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M9.9 4.24"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20"/>',
 'bug': '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
 'code': '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
 'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
 'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
 'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
 'check': '<path d="M20 6 9 17l-5-5"/>',
 'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
}
def ic(name, cls=''):
    return f'<span class="icon {cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{I[name]}</svg></span>'
def svg(name, size=16):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{I[name]}</svg>'

NAV = [('index.html', 'Home'), ('caratteristiche.html', 'Caratteristiche'), ('motore.html', 'Motore 2D e partita'),
       ('download.html', 'Download e guida'), ('community.html', 'Community e note')]

def page(fname, title, desc, body):
    nav = '\n'.join(f'        <a href="{h}"{" class=\"on\" aria-current=\"page\"" if h == fname else ""}>{n}</a>' for h, n in NAV)
    html = f'''<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#0f131d" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="img/partita.jpg" />
  <link rel="icon" href="favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="top">
    <div class="wrap">
      <a class="brand" href="index.html"><img src="favicon.png" alt="" width="32" height="32" /><span>TFM <b>27</b><small>TACTIC F.C. MANAGER</small></span></a>
      <nav id="nav">
{nav}
      </nav>
      <div class="actions">
        <a class="btn sm gh" href="{REPO}">{svg('code', 14)} GitHub</a>
        <a class="btn sm primary dl" href="{DL}">{svg('download', 14)} Scarica per Windows <small>113 MB</small></a>
      </div>
      <button class="btn sm menu" aria-controls="nav" aria-expanded="false" onclick="var n=document.getElementById('nav');this.setAttribute('aria-expanded',n.classList.toggle('open'))">Menu</button>
    </div>
  </header>

  <main>
{body}
  </main>

  <footer>
    <div class="wrap">
      <div class="cols">
        <div>
          <a class="brand" href="index.html"><img src="favicon.png" alt="" width="32" height="32" /><span>Tactic F.C. Manager</span></a>
          <p>Gioco manageriale di calcio gratuito e in italiano. Spogliatoio vivo, partite in 2D, storie che nascono dal campionato.</p>
          <p><span class="tag">GPL-3.0</span> <span class="tag cy">v0.1.0 collaudo</span></p>
        </div>
        <div><h4>Il sito</h4><ul>{''.join(f'<li><a href="{h}">{n}</a></li>' for h, n in NAV)}</ul></div>
        <div><h4>Documenti</h4><ul>
          <li><a href="{REPO}/blob/main/docs/release-notes.md">Note di rilascio</a></li>
          <li><a href="{REPO}/blob/main/docs/03-match-engine.md">Come funziona il motore</a></li>
          <li><a href="{REPO}/blob/main/assets/LICENSES.md">Licenze</a></li>
          <li><a href="{REPO}/blob/main/LICENSE">Licenza GPL-3.0</a></li>
        </ul></div>
        <div><h4>Progetto</h4><ul>
          <li><a href="{REPO}">Codice sorgente</a></li>
          <li><a href="{REPO}/releases">Tutte le versioni</a></li>
          <li><a href="{REPO}/issues">Segnala un problema</a></li>
          <li><a href="{REPO}/discussions">Discussioni</a></li>
        </ul></div>
      </div>
      <div class="legal"><span>© 2026 Tactic F.C. Manager · codice sotto licenza GNU GPL v3.0</span><span>Club e giocatori inventati · nessun dato raccolto</span></div>
    </div>
  </footer>
</body>
</html>
'''
    io.open(os.path.join(OUT, fname), 'w', encoding='utf-8', newline='\n').write(html)

def shot(img, alt, label, right=''):
    return f'<div class="shot"><div class="bar">{label}<span>{right}</span></div><img src="img/{img}" alt="{alt}" loading="lazy" /></div>'

def cta(title, text, second=('download.html', 'Come si installa')):
    return f'''    <section>
      <div class="wrap">
        <div class="cta-box">
          <div><div class="kicker">Pronto per la panchina?</div><h2>{title}</h2><p>{text}</p></div>
          <div class="row"><a class="btn" href="{second[0]}">{second[1]}</a><a class="btn primary big" href="{DL}">{svg('download')} Scarica TFM 27</a></div>
        </div>
      </div>
    </section>'''

# ---------- HOME ----------
home = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <img class="logo" src="img/logo.webp" alt="Tactic F.C. Manager" width="150" height="175" />
          <span class="pill g">Versione di collaudo 0.1.0 · gratis</span>
          <h1>Non alleni una rosa.<br /><span class="hl">Alleni un gruppo di persone.</span></h1>
          <p class="lead">Tactic F.C. Manager è un gioco manageriale di calcio, gratuito e in italiano. I tuoi giocatori hanno amici e
            rivali, un morale che contagia gli altri, promesse che si ricordano — e agenti che se le ricordano per loro.</p>
          <div class="cta">
            <a class="btn primary big" href="{DL}">{svg('download')} Scarica per Windows <small>113 MB</small></a>
            <a class="btn big" href="caratteristiche.html">Scopri il gioco</a>
          </div>
          <div class="fine">Windows 10 e 11, 64 bit · niente pubblicità, niente account, niente internet</div>
        </div>
        {shot('partita.jpg', "Una partita dal vivo: il campo in 2D, la panchina e l'analista", 'partita dal vivo', '2D')}
      </div>
      <div class="wrap">
        <div class="stats">
          <div class="stat"><span>Club</span><b>40</b><p>in due campionati, con promozioni e retrocessioni</p></div>
          <div class="stat"><span>Storie</span><b class="cy">40</b><p>tipi di storie che nascono da quello che succede</p></div>
          <div class="stat"><span>Ruoli in campo</span><b>27</b><p>ognuno cambia davvero il modo di muoversi</p></div>
          <div class="stat"><span>Prezzo</span><b class="cy">0 €</b><p>e il codice è pubblico, con licenza GPL-3.0</p></div>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Cosa c'è dentro</div><h2>Tutto quello che ti aspetti. Più quello che di solito resta nascosto.</h2>
          <p>Tattica, allenamento, mercato, finanze — e le persone: rapporti, promesse, pressione dei giornali.</p></div>
        <div class="grid g4">
          <a class="panel" href="caratteristiche.html#spogliatoio">{ic('users')}<h3>Spogliatoio vivo</h3><p>Amicizie, rivalità, leader. Il morale di uno arriva ai compagni.</p></a>
          <a class="panel" href="motore.html">{ic('route', 'cy')}<h3>Partita in 2D</h3><p>Segui ogni azione con la panchina, la pausa tattica e l'analista.</p></a>
          <a class="panel" href="caratteristiche.html#stampa">{ic('news', 'am')}<h3>Storie e stampa</h3><p>La crisi, la serie positiva, il predestinato. E le domande dei giornalisti.</p></a>
          <a class="panel" href="caratteristiche.html#mercato">{ic('search')}<h3>Mercato con la nebbia</h3><p>Degli altri vedi solo stime. Gli osservatori sbagliano, gli agenti ricordano.</p></a>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker">La tua scrivania</div>
          <h2>Ogni mattina, quello che conta.</h2>
          <p>Posizione, forma, cassa e morale in quattro numeri. La prossima partita con il pulsante per la formazione e quello per
            scendere in campo. Le notizie, la classifica, la guida della prima stagione.</p>
          <ul class="checks">
            <li><b>Una prima partita guidata</b> in cinque passi, e ogni schermata si spiega la prima volta che la apri.</li>
            <li><b>Coppa nazionale</b>, amichevoli estive, campionato Primavera, nazionali con Europeo e Mondiale.</li>
            <li><b>Cinque slot</b> di salvataggio, sul tuo computer.</li>
          </ul>
        </div>
        {shot('scrivania.jpg', 'La scrivania con classifica, prossima partita e notizie', 'scrivania')}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head c"><div class="kicker">Guarda</div><h2>Come si presenta</h2></div>
        <div class="grid g3">
          {shot('tattica.jpg', 'La tattica con modulo e ruoli', 'tattica')}
          {shot('spogliatoio.jpg', 'Il grafo dello spogliatoio', 'spogliatoio')}
          {shot('mercato.jpg', 'La ricerca giocatori con stime', 'mercato')}
          {shot('storie.jpg', 'Una conferenza stampa', 'stampa')}
          {shot('inizio.jpg', 'La scelta del club a inizio carriera', 'nuova carriera')}
          {shot('partita.jpg', 'La partita in 2D', 'partita')}
        </div>
      </div>
    </section>
{cta('Prendi il comando della tua squadra.', 'Gratis, senza pubblicità e senza account. Si installa in un minuto, senza permessi di amministratore.')}'''
page('index.html', 'Tactic F.C. Manager (TFM 27) — il gioco manageriale di calcio dove alleni persone',
     'Tactic F.C. Manager è un gioco manageriale di calcio gratuito, in italiano. Spogliatoio vivo, partite in 2D, mercato con agenti che ricordano, storie che nascono dal campionato.', home)

# ---------- CARATTERISTICHE ----------
feat = f'''    <div class="hero">
      <div class="wrap">
        <span class="pill g">Caratteristiche · TFM 27</span>
        <h1>Ogni decisione lascia il segno:<br /><span class="hl">le caratteristiche di TFM 27.</span></h1>
        <p class="lead">Nessuna formula nascosta nei numeri. Giocatori con rapporti veri, osservatori con i loro pregiudizi e una
          tattica che si vede davvero in campo.</p>
        <div class="stats">
          <div class="stat"><span>Spogliatoio</span><b>Grafo</b><p>ogni giocatore ha un rapporto con ciascun compagno</p></div>
          <div class="stat"><span>Storie</span><b class="cy">40</b><p>tipi di storie, con la stampa che ne parla</p></div>
          <div class="stat"><span>Attributi</span><b>36</b><p>da 1 a 20, più sei assi di personalità</p></div>
          <div class="stat"><span>Tattica</span><b class="cy">5 × 27</b><p>moduli e ruoli, con istruzioni di squadra</p></div>
        </div>
      </div>
    </div>

    <section class="alt" id="spogliatoio">
      <div class="wrap split">
        <div class="text">
          <div class="kicker">Pilastro 01 · Dinamiche interne</div>
          <h2>Chi è amico di chi: <span class="hl">la psicologia non è un valore numerico fisso.</span></h2>
          <p>Il morale va da 1 a 100, ma nessuno vive da solo: amicizie, rivalità, gruppi per nazionalità, leader che il resto della
            squadra ascolta. Una lite in allenamento può diventare una faida.</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>Grafo dello spogliatoio</b><p>Vedi chi comanda, chi è isolato e da dove parte il malumore prima che diventi una crisi.</p></div></div>
            <div class="point"><i>→</i><div><b>Promesse che si ricordano</b><p>Prometti spazio a un giovane e poi lo lasci in tribuna: se ne ricorda lui, e il suo agente al prossimo rinnovo.</p></div></div>
          </div>
        </div>
        {shot('spogliatoio.jpg', 'Il grafo dello spogliatoio con leader e rapporti fra i giocatori', 'spogliatoio', 'grafo')}
      </div>
    </section>

    <section>
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker cy">Pilastro 02 · Tattica e ruoli</div>
          <h2>Le scelte si vedono in campo: <span class="cy">niente algoritmi oscuri.</span></h2>
          <p>Moduli, ruoli e istruzioni cambiano il modo in cui la squadra si muove. Un terzino che spinge lascia spazio dietro; una
            linea alta invita la palla in profondità. Lo vedi nel campo 2D, non in una tabella.</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>Familiarità col modulo e col ruolo</b><p>Un modulo nuovo si impara con l'allenamento: all'inizio la squadra rende meno.</p></div></div>
            <div class="point"><i>→</i><div><b>Partita dal vivo con l'analista</b><p>Durante la gara l'analista ti dice dove stai perdendo, e puoi cambiare senza fermare tutto.</p></div></div>
          </div>
        </div>
        {shot('tattica.jpg', 'La schermata della tattica', 'tattica', 'modulo')}
      </div>
    </section>

    <section class="alt" id="stampa">
      <div class="wrap split">
        <div class="text">
          <div class="kicker am">Pilastro 03 · Storie e stampa</div>
          <h2>Il campionato racconta: <span style="color:var(--amber)">oltre 40 storie vive.</span></h2>
          <p>Le storie nascono da quello che succede: la crisi, la serie positiva, il ragazzo predestinato, la bestia nera che ti batte da
            tre anni. I giornalisti ti fanno domande su quelle storie.</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>Sai prima l'effetto delle risposte</b><p>Ogni risposta mostra cosa sposta: il morale di un giocatore, i tifosi, la fiducia della dirigenza.</p></div></div>
            <div class="point"><i>→</i><div><b>Il clima attorno alla squadra</b><p>I giornali della città, la pressione sulle partite importanti, il racconto della lega.</p></div></div>
          </div>
        </div>
        {shot('storie.jpg', 'Una conferenza stampa con le risposte e i loro effetti', 'sala stampa')}
      </div>
    </section>

    <section id="mercato">
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker">Pilastro 04 · Osservatori e mercato</div>
          <h2>Non sai mai tutto: <span class="hl">il mercato è una scommessa ponderata.</span></h2>
          <p>Dei giocatori degli altri vedi solo stime, con la loro incertezza. Gli osservatori le rendono più precise — ma qualcuno sbaglia
            sempre nella stessa direzione, e un colpo può rivelarsi un bidone.</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>Trattative vere</b><p>Prezzo nascosto, pazienza che si consuma, rate, bonus, percentuale sulla rivendita, prestiti, parametro zero.</p></div></div>
            <div class="point"><i>→</i><div><b>Agenti con la memoria</b><p>Se hai trattato male un loro assistito, lo sanno. E si fa sentire al tavolo.</p></div></div>
          </div>
        </div>
        {shot('mercato.jpg', 'La ricerca giocatori con filtri e stime', 'mercato', 'stime')}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Le fondamenta</div><h2>I pilastri della gestione</h2></div>
        <div class="grid g3">
          <div class="panel">{ic('sprout')}<h3>Vivaio e Primavera</h3><p>Ogni estate arriva un'annata di ragazzi, con l'anteprima di chi sta per arrivare. Ogni tanto, anche nel club più piccolo, un talento fuori dal comune.</p><div class="foot">Campionato Primavera</div></div>
          <div class="panel">{ic('coins', 'cy')}<h3>Conti veri</h3><p>Biglietti, diritti tv, sponsor, stipendi, rate dei trasferimenti. Cassa mese per mese e proiezione di fine stagione. Il fair play finanziario non perdona.</p><div class="foot">Fair play finanziario</div></div>
          <div class="panel">{ic('landmark', 'am')}<h3>La dirigenza</h3><p>Ti dà un obiettivo, ma è un contratto: puoi chiedere due stagioni di tempo, e lo paghi subito in fiducia. Se la fiducia finisce, arriva l'esonero.</p><div class="foot">Obiettivi rinegoziabili</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head"><div class="kicker">Guida rapida</div><h2>Come iniziare con TFM 27</h2><p>Nessun permesso di amministratore, nessun account.</p></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>Scarica</h3><p>Il file <span class="mono">TFM27-Setup.exe</span> (113 MB) dal pulsante in alto.</p></div>
          <div class="panel step"><span class="n">02</span><h3>Avvia e conferma</h3><p>Se Windows mostra l'avviso SmartScreen: «Ulteriori informazioni» e poi «Esegui comunque».</p></div>
          <div class="panel step"><span class="n">03</span><h3>Scegli il club</h3><p>Filtra i 40 club per campionato e ambizione, leggi il dossier e scegli la tua filosofia.</p></div>
          <div class="panel step"><span class="n">04</span><h3>Segui la guida</h3><p>La prima stagione ti accompagna in cinque passi: formazione, allenamento, prima partita.</p></div>
        </div>
      </div>
    </section>
{cta('Tocca a te.', 'Tactic F.C. Manager è gratuito e libero, con licenza GPL-3.0. Nessun acquisto nel gioco.', ('motore.html', 'Il motore della partita'))}'''
page('caratteristiche.html', 'Caratteristiche — Tactic F.C. Manager',
     'Spogliatoio con rapporti veri, tattica che si vede in campo, 40 tipi di storie, mercato con stime e agenti che ricordano.', feat)

# ---------- MOTORE ----------
motore = f'''    <div class="hero">
      <div class="wrap">
        <span class="pill g">Motore della partita · azione per azione</span>
        <h1>La partita in 2D:<br /><span class="hl">si gioca a carte scoperte.</span></h1>
        <p class="lead">Nessuna animazione di facciata sopra un risultato già deciso. Ogni passaggio, ogni pressing, ogni palla in profondità
          che vedi è quella che il motore ha appena calcolato.</p>
        <div class="stats">
          <div class="stat"><span>Campo</span><b>12 × 8</b><p>zone continue: ogni giocatore corre, non si teletrasporta</p></div>
          <div class="stat"><span>Fotogrammi</span><b class="cy">4 al secondo</b><p>posizioni dal motore, interpolate per il disegno</p></div>
          <div class="stat"><span>Decisioni</span><b>Ad ogni azione</b><p>passaggio, profondità, dribbling, tiro o cross</p></div>
          <div class="stat"><span>Simulazione</span><b class="cy">Istantanea</b><p>se non vuoi guardare, il risultato in un attimo</p></div>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">La partita dal vivo</div><h2>La console della panchina</h2>
          <p>Il campo, i tabellini, la cronaca, l'inerzia della gara e l'analista, tutto nella stessa schermata. I cambi e le istruzioni che
            decidi contano davvero: il motore simula solo poco più avanti di quello che stai guardando.</p></div>
        {shot('partita.jpg', "Una partita dal vivo: il campo in 2D, la panchina e l'analista", 'partita dal vivo', 'motore L2')}
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head"><div class="kicker cy">L'analista</div><h2>Cosa succede, e perché</h2>
          <p>Durante i 90 minuti l'analista legge i dati per te e li trasforma in consigli: dove state perdendo il pallone, chi è stanco,
            quale corridoio lasciate aperto.</p></div>
        <div class="grid g4">
          <div class="panel">{ic('activity')}<h3>Inerzia</h3><p>Chi sta spingendo e da quanto: la barra si sposta con gli eventi della gara.</p></div>
          <div class="panel">{ic('target', 'cy')}<h3>xG e tiri</h3><p>La qualità delle occasioni, non solo il numero: un tiro da fuori non vale un rigore in movimento.</p></div>
          <div class="panel">{ic('route', 'am')}<h3>Passaggi e corridoi</h3><p>Da dove passa il gioco e dove lo perdete. Le mappe dei passaggi e delle zone calde.</p></div>
          <div class="panel">{ic('chart')}<h3>Duelli e pressing</h3><p>Contrasti, recuperi, pressione sul portatore. Chi regge e chi sta cedendo.</p></div>
        </div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap split">
        <div class="text">
          <div class="kicker">Intervento tattico</div>
          <h2>Pausa tattica: <span class="hl">cambi la gara senza fermarla per sempre.</span></h2>
          <p>Una pausa, e hai davanti tutto: mentalità, pressing, ampiezza, linea difensiva, verticalità. Cambi, ruoli, e si riparte.</p>
          <div class="points">
            <div class="point"><i>{svg('pause', 15)}</i><div><b>Regolazioni rapide</b><p>Cinque istruzioni di squadra e la mentalità, anche senza aprire la tattica completa.</p></div></div>
            <div class="point"><i>{svg('users', 15)}</i><div><b>Cinque cambi</b><p>Con condizione, voto e cartellini sotto gli occhi.</p></div></div>
            <div class="point"><i>{svg('mega', 15)}</i><div><b>Indicazioni dalla panchina</b><p>Incoraggia, chiedi di più, calma. Chi regge male la pressione, se gli chiedi di più, rende peggio.</p></div></div>
          </div>
        </div>
        <div class="shot"><div class="bar">console · correzioni rapide<span>in pausa</span></div>
          <pre class="code"><span class="c">// quello che cambi qui entra nell'azione successiva</span>
<span class="k">mentalità</span>       <span class="n">4</span>  <span class="s">offensiva</span>
<span class="k">pressing</span>        <span class="n">2</span>  <span class="s">alto</span>
<span class="k">ampiezza</span>        <span class="n">2</span>  <span class="s">larga</span>
<span class="k">linea difensiva</span> <span class="n">1</span>  <span class="s">media</span>
<span class="k">verticalità</span>     <span class="n">2</span>  <span class="s">diretta</span>

<span class="c">// cambio</span>
<span class="k">esce</span>  MC  <span class="n">62%</span> condizione
<span class="k">entra</span> AMC <span class="n">98%</span> condizione</pre></div>
      </div>
    </section>

    <section>
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker am">Per chi va di fretta</div>
          <h2>Simulazione istantanea e report finale</h2>
          <p>Preferisci concentrarti su mercato, spogliatoio e bilancio? Simula la partita in un attimo: il risultato è lo stesso motore,
            le statistiche sono le stesse.</p>
          <ul class="checks">
            <li><b>Migliore in campo</b> e voti colorati per tutti (sopra l'8 in verde, sotto il 6 in rosso).</li>
            <li><b>Statistiche a confronto</b>: possesso, tiri, xG, passaggi, contrasti, falli, calci d'angolo.</li>
            <li><b>Cronologia</b> di gol, cartellini, cambi e infortuni.</li>
          </ul>
        </div>
        {shot('tattica.jpg', 'La tattica, con modulo e ruoli', 'prima della partita')}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Sotto il cofano</div><h2>Come ragiona un giocatore col pallone</h2></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>Posizioni</h3><p>Ognuno corre verso il suo posto ideale — modulo, ruolo, palla — a velocità limitata da Velocità, Accelerazione ed energia.</p></div>
          <div class="panel step"><span class="n">02</span><h3>Pressione</h3><p>I difensori vicini pressano il portatore, secondo Sacrificio, energia e istruzioni.</p></div>
          <div class="panel step"><span class="n">03</span><h3>Opzioni</h3><p>Passaggio a ogni compagno, palla in profondità, dribbling, tiro, cross: ognuno con probabilità di riuscita e valore.</p></div>
          <div class="panel step"><span class="n">04</span><h3>Scelta</h3><p>Chi ha Decisioni alte sceglie quasi sempre bene. Sotto pressione e con poca Compostezza, sbaglia di più.</p></div>
        </div>
        <p style="margin-top:22px">Il morale, la condizione e le amicizie entrano in campo: fra due amici il passaggio arriva un po' più spesso.
          La spiegazione completa è in <a href="{REPO}/blob/main/docs/03-match-engine.md">docs/03-match-engine.md</a>.</p>
      </div>
    </section>
{cta('Vivi la partita in prima persona.', 'Disponibile gratis con licenza GPL-3.0, per Windows 10 e 11 a 64 bit.')}'''
page('motore.html', 'Motore 2D e partita — Tactic F.C. Manager',
     'La partita in 2D di Tactic F.C. Manager: ogni azione calcolata dal motore, panchina, pausa tattica, analista e simulazione istantanea.', motore)

# ---------- DOWNLOAD ----------
dl = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <span class="pill g">Versione 0.1.0 · collaudo</span> <span class="pill">GPL-3.0 · codice aperto</span>
          <h1>Scarica TFM 27 e scendi <span class="hl">subito in panchina.</span></h1>
          <p class="lead">Gira tutto sul tuo computer: nessun account, nessuna raccolta di dati, nessun costo nascosto.</p>
          <div class="grid g2" style="margin-top:26px">
            <div class="point"><i>{svg('shield', 15)}</i><div><b>Offline e privato</b><p>I salvataggi restano nel tuo computer.</p></div></div>
            <div class="point"><i>{svg('monitor', 15)}</i><div><b>Leggero</b><p>Nessuna scheda video speciale.</p></div></div>
          </div>
        </div>
        <div class="panel hi">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3>{svg('monitor', 18)} Windows 64 bit</h3><span class="tag">collaudo</span></div>
          <p style="margin-top:12px"><b class="mono" style="color:var(--text)">TFM27-Setup.exe</b> · 113 MB · versione 0.1.0</p>
          <a class="btn primary big" style="width:100%;justify-content:center;margin:16px 0" href="{DL}">{svg('download')} Scarica l'installer</a>
          <div class="hash"><b>SHA-256</b>{SHA}</div>
          <p style="margin-top:10px;font-size:13px">Per controllare il file scaricato, in PowerShell: <span class="mono">Get-FileHash TFM27-Setup.exe</span>. Il numero deve essere uguale.</p>
          <p style="margin-top:10px;font-size:13px"><a href="{REPO}/releases">Tutte le versioni</a> · <a href="{REPO}">Codice sorgente</a></p>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Installazione</div><h2>Come installare TFM 27 in 4 passi</h2>
          <p>L'installer è gratuito e non ancora firmato (il certificato di firma si paga): per questo Windows può mostrare un avviso la prima volta.</p></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>Scarica</h3><p>Premi il pulsante qui sopra e salva <span class="mono">TFM27-Setup.exe</span>.</p><div class="foot">113 MB</div></div>
          <div class="panel step"><span class="n">02</span><h3>Avviso SmartScreen</h3><p>Se compare «Windows ha protetto il PC», clicca <b>Ulteriori informazioni</b> e poi <b>Esegui comunque</b>.</p><div class="foot">codice pubblico e verificabile</div></div>
          <div class="panel step"><span class="n">03</span><h3>Scegli la cartella</h3><p>Il gioco si installa nella tua cartella utente. Non servono permessi di amministratore.</p><div class="foot">nessuna modifica al sistema</div></div>
          <div class="panel step"><span class="n">04</span><h3>Gioca</h3><p>Scegli il club, la tua filosofia, e la prima stagione ti accompagna passo per passo.</p><div class="foot">prima partita guidata</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker cy">Salvataggi</div>
          <h2>Cinque slot, tutti sul tuo computer</h2>
          <p>Ogni slot ha un nome, la data di gioco e il tempo passato in panchina. La carriera si può esportare in un file
            <span class="mono">.dsa</span> da tenere da parte o da portare su un altro computer.</p>
          <ul class="checks">
            <li>I file sono in <span class="mono">%APPDATA%\\talisman\\saves</span>, con il pulsante per aprire la cartella.</li>
            <li>Un controllo di integrità verifica il mondo prima di caricarlo.</li>
            <li>Se qualcosa va storto, «Esporta diagnostica» crea un file che decidi tu se mandare.</li>
          </ul>
        </div>
        <div class="panel">
          <h3>Novità in arrivo</h3>
          <ul class="checks">
            <li><b>Coppa nazionale</b> a eliminazione diretta, con rigori e albo d'oro; amichevoli estive.</li>
            <li><b>Campionato Primavera</b> e anteprima della prossima annata del vivaio.</li>
            <li><b>Filosofia dell'allenatore</b>: gestore, tattico o scopritore di talenti.</li>
            <li><b>Indicazioni dalla panchina</b> durante la partita.</li>
            <li>Proiezione dei conti a fine stagione, cassa mese per mese.</li>
          </ul>
          <div class="foot"><a href="{REPO}/blob/main/docs/release-notes.md">Note di rilascio complete →</a></div>
        </div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap split">
        <div>
          <div class="head"><div class="kicker">Requisiti</div><h2>Cosa serve</h2></div>
          <div class="tbl"><table>
            <thead><tr><th>Componente</th><th>Richiesto</th></tr></thead>
            <tbody>
              <tr><td>Sistema</td><td>Windows 10 o 11, 64 bit</td></tr>
              <tr><td>Memoria</td><td>4 GB (8 GB consigliati)</td></tr>
              <tr><td>Scheda video</td><td>quella integrata basta</td></tr>
              <tr><td>Spazio su disco</td><td>circa 400 MB, più i salvataggi</td></tr>
              <tr><td>Internet</td><td>solo per scaricarlo</td></tr>
            </tbody>
          </table></div>
        </div>
        <div class="panel">
          <h3>{svg('monitor', 18)} Linux e Mac</h3>
          <p>La versione Linux (AppImage) è pronta nel codice ma va costruita su un computer Linux: arriverà con una delle prossime versioni.
            Per Mac non c'è ancora una data.</p>
          <p>Chi usa Linux può già compilarla dal codice sorgente:</p>
          <pre class="code" style="border-radius:8px;margin-top:12px">pnpm install
pnpm dist:linux</pre>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head c"><div class="kicker">Domande</div><h2>Download e salvataggi</h2></div>
        <div class="faq">
          <details><summary>È davvero gratis?</summary><p>Sì. Niente pubblicità, niente acquisti nel gioco, niente account. Il codice è pubblico con licenza GPL-3.0.</p></details>
          <details><summary>Perché Windows dice che l'editore è sconosciuto?</summary><p>Perché l'installer non è firmato: il certificato di firma si compra, e per una versione di collaudo non l'abbiamo preso. Puoi controllare che il file sia quello giusto con il codice SHA-256 qui sopra.</p></details>
          <details><summary>Il gioco manda i miei dati da qualche parte?</summary><p>No. Il gioco non si collega a internet. I salvataggi e il registro degli errori restano sul tuo computer.</p></details>
          <details><summary>Ci sono i club e i giocatori veri?</summary><p>No: club, città e giocatori sono inventati. Il formato del mondo è pensato perché, in futuro, chi vuole possa caricare dati propri.</p></details>
          <details><summary>È una versione finita?</summary><p>È una versione di collaudo: si gioca una stagione intera e oltre, ma è il momento giusto per segnalare quello che non va. I limiti noti sono nelle <a href="{REPO}/blob/main/docs/release-notes.md">note di rilascio</a>.</p></details>
          <details><summary>Come lo disinstallo?</summary><p>Da Impostazioni → App di Windows, come ogni altro programma. I salvataggi restano in <span class="mono">%APPDATA%\\talisman</span>: cancellali a mano se non ti servono più.</p></details>
        </div>
      </div>
    </section>
{cta('Vuoi guardare dentro il codice?', 'Tutto il gioco è su GitHub: motore, interfaccia, bilanciamento e documenti di progetto.', (REPO, 'Codice su GitHub'))}'''
page('download.html', 'Download e guida — Tactic F.C. Manager',
     'Scarica Tactic F.C. Manager per Windows: installer gratuito da 113 MB, installazione in 4 passi, salvataggi locali, domande frequenti.', dl)

# ---------- COMMUNITY ----------
comm = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <span class="pill g">GPL-3.0 · codice aperto · zero dati</span>
          <h1>Costruito in chiaro,<br /><span class="hl">libero per sempre.</span></h1>
          <p class="lead">Tactic F.C. Manager è un gioco manageriale trasparente: il motore, le regole e il bilanciamento sono pubblici e leggibili riga per riga.</p>
          <div class="cta">
            <a class="btn primary big" href="{REPO}/issues">{svg('bug')} Segnala un problema</a>
            <a class="btn big" href="{REPO}">{svg('code')} Codice su GitHub</a>
          </div>
        </div>
        <div class="shot"><div class="bar">terminale<span>GPL-3.0</span></div>
          <pre class="code"><span class="c">$</span> git clone <span class="s">{REPO}</span>
<span class="c">$</span> pnpm install
<span class="c">$</span> pnpm sim -- --seasons <span class="n">10</span> --seed <span class="n">42</span>
<span class="k">stagioni</span>       <span class="n">10</span>
<span class="k">gol a partita</span>  <span class="n">2,85</span>
<span class="k">pareggi</span>        <span class="n">21,9%</span>
<span class="c"># il laboratorio di bilanciamento: gira in Node,</span>
<span class="c"># senza interfaccia, con lo stesso motore del gioco</span></pre></div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Principi del progetto</div><h2>Un gioco che rispetta te e i tuoi dati</h2></div>
        <div class="grid g4">
          <div class="panel">{ic('code')}<h3>Licenza GPL-3.0</h3><p>Libero di studiarlo, modificarlo e ridistribuirlo. Nessuna parte del motore è segreta.</p><div class="foot">Codice trasparente</div></div>
          <div class="panel">{ic('wifioff', 'cy')}<h3>Offline</h3><p>Nessun launcher, nessun account, nessuna connessione richiesta per giocare.</p><div class="foot">Totale autonomia</div></div>
          <div class="panel">{ic('save', 'am')}<h3>Salvataggi locali</h3><p>File sul tuo disco, esportabili in un file solo. Facili da copiare o tenere da parte.</p><div class="foot">5 slot + esportazione</div></div>
          <div class="panel">{ic('eyeoff')}<h3>Zero telemetria</h3><p>Nessun tracciamento. La diagnostica si crea solo se la chiedi tu, e decidi tu a chi mandarla.</p><div class="foot">Privacy di base</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker cy">Dati e modding</div>
          <h2>Un mondo in un formato aperto</h2>
          <p>Il gioco genera club, città e giocatori inventati. Il formato del mondo è lo stesso che userà il database della community:
            chi vorrà potrà caricare i propri campionati. Nomi e stemmi reali non li distribuiamo noi — li carica chi li possiede.</p>
          <div class="points">
            <div class="point"><i>01</i><div><b>Esporta la carriera</b><p>Un file solo con tutto il mondo, da condividere o riprendere altrove.</p></div></div>
            <div class="point"><i>02</i><div><b>Stemmi generati</b><p>Colori e forme nascono dal gioco: nessuna immagine esterna.</p></div></div>
            <div class="point"><i>03</i><div><b>Migrazioni</b><p>Ogni cambio di formato ha la sua conversione: i salvataggi vecchi si riaprono.</p></div></div>
          </div>
        </div>
        <div class="shot"><div class="bar">un club nel formato del mondo<span>JSON</span></div>
          <pre class="code">{{
  <span class="k">"name"</span>: <span class="s">"Virtus Roccabianca"</span>,
  <span class="k">"city"</span>: <span class="s">"Roccabianca"</span>,
  <span class="k">"colors"</span>: [<span class="s">"#1f7a4d"</span>, <span class="s">"#f2f2f2"</span>, <span class="s">"#0f131d"</span>],
  <span class="k">"crest"</span>: <span class="n">null</span>, <span class="c">// null = stemma generato</span>
  <span class="k">"reputation"</span>: <span class="n">62</span>,
  <span class="k">"stadium"</span>: {{ <span class="k">"name"</span>: <span class="s">"Stadio Comunale"</span>, <span class="k">"capacity"</span>: <span class="n">14200</span> }},
  <span class="k">"tactic"</span>: {{ <span class="k">"formation"</span>: <span class="s">"4-3-3"</span>, <span class="k">"mentality"</span>: <span class="n">3</span>, <span class="c">…</span> }},
  <span class="k">"playerIds"</span>: [<span class="n">412</span>, <span class="n">413</span>, <span class="n">414</span>, <span class="c">…</span>]
}}</pre></div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">Strada fatta, strada da fare</div><h2>Roadmap</h2>
          <p>Il gioco è stato costruito a fasi, ognuna provata prima di passare alla successiva.</p></div>
        <div class="grid g3 road">
          <div class="panel done"><span class="tag">Fatto · 0.1.0</span><h3>Il gioco completo</h3><p>Motore partita e campo 2D, spogliatoio, mercato e osservatori, storie e stampa, finanze e dirigenza, vivaio e nazionali, installer per Windows.</p></div>
          <div class="panel now"><span class="tag cy">Adesso · collaudo</span><h3>Grafica nuova e collaudo esterno</h3><p>Tutte le schermate rifatte, coppa nazionale e Primavera. Tre persone giocano una stagione intera senza aiuto: quello che non capiscono si sistema.</p></div>
          <div class="panel next"><span class="tag am">Dopo · 1.0</span><h3>Più campionati e l'editor</h3><p>Versione Linux, altre leghe, un editor per il mondo e i database della community, statistiche storiche.</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head c"><div class="kicker">Partecipa</div><h2>Come dare una mano</h2><p>Non serve saper programmare: la cosa più utile è giocare e raccontare cosa non torna.</p></div>
        <div class="grid g3">
          <div class="panel">{ic('bug')}<h3>Segnala un problema</h3><p>Qualcosa si blocca, un numero non torna, una schermata non si capisce: apri una segnalazione. Se puoi, allega il file di «Esporta diagnostica».</p>
            <p style="margin-top:14px"><a class="btn sm primary" href="{REPO}/issues/new">Apri una segnalazione</a></p></div>
          <div class="panel">{ic('book', 'cy')}<h3>Racconta la tua stagione</h3><p>Cosa racconteresti a un amico? Cosa ti ha annoiato? Le risposte dicono dove investire per la 1.0.</p>
            <p style="margin-top:14px"><a class="btn sm" href="{REPO}/discussions">Discussioni</a></p></div>
          <div class="panel">{ic('git', 'am')}<h3>Guarda il codice</h3><p>TypeScript, React ed Electron. Il motore è puro e ha i suoi test; il bilanciamento si misura con il laboratorio <span class="mono">pnpm sim</span>.</p>
            <p style="margin-top:14px"><a class="btn sm" href="{REPO}">Apri il repository</a></p></div>
        </div>
      </div>
    </section>
{cta('Scendi in campo.', 'Scarica la versione di collaudo e dicci cosa ne pensi.')}'''
page('community.html', 'Community e note — Tactic F.C. Manager',
     'Tactic F.C. Manager è aperto (GPL-3.0), offline e senza telemetria. Roadmap, formato del mondo e come partecipare.', comm)
print('ok')
