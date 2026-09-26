# Genera le 5 pagine del sito in italiano (site/) e in inglese (site/en/), con la stessa testata, lo stesso piè di
# pagina e il cambio di lingua con le bandiere. Uso: python tools/site.py (lo stile è in site/style.css)
# Nuova versione: VERSION, SIZE e SHA (Get-FileHash release/TFM27-Setup.exe); i numeri di pnpm sim nel terminale della Community.
import io, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
REPO = 'https://github.com/XmarcoS10/talisman'
SITE = 'https://xmarcos10.github.io/talisman/'
DL = REPO + '/releases/latest/download/TFM27-Setup.exe'
VERSION = '0.2.1'
SIZE = '123 MB'
SHA = '435b51bcdf0b19e76fa473bc63f40cf0d225c9e0cb19c310f3228fa445ad14f8'
# pnpm sim -- --seasons 10 --seed 42 con la 0.2.0
SIM_GOALS = {'it': '2,56', 'en': '2.56'}
SIM_DRAWS = {'it': '23,2%', 'en': '23.2%'}

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

# bandiere per il cambio di lingua (le emoji delle bandiere su Windows non si vedono)
FLAG = {
 'it': '<svg viewBox="0 0 3 2" aria-hidden="true"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>',
 'en': '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="uk"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath><path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#uk)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>',
}

LANG = 'it'
def x(it, en):
    """il testo nella lingua della pagina che si sta scrivendo"""
    return en if LANG == 'en' else it

def R():
    """le pagine inglesi stanno in site/en/: immagini, stile e clip sono una cartella sopra"""
    return '../' if LANG == 'en' else ''

def nav_items():
    return [('index.html', 'Home'), ('caratteristiche.html', x('Caratteristiche', 'Features')),
            ('motore.html', x('Motore 2D e partita', '2D engine and match')), ('download.html', x('Download e guida', 'Download and guide')),
            ('community.html', x('Community e note', 'Community and notes'))]

def switch(fname):
    it_href, en_href = (f'../{fname}', fname) if LANG == 'en' else (fname, f'en/{fname}')
    on = lambda l: ' class="on" aria-current="true"' if l == LANG else ''
    return (f'<div class="lang" role="group" aria-label="Lingua / Language">'
            f'<a href="{it_href}" hreflang="it" lang="it"{on("it")} title="Italiano" aria-label="Italiano">{FLAG["it"]}</a>'
            f'<a href="{en_href}" hreflang="en" lang="en"{on("en")} title="English" aria-label="English">{FLAG["en"]}</a></div>')

def page(fname, title, desc, body):
    r = R()
    nav = '\n'.join(f'        <a href="{h}"{" class=\"on\" aria-current=\"page\"" if h == fname else ""}>{n}</a>' for h, n in nav_items())
    html = f'''<!doctype html>
<html lang="{LANG}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#0f131d" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="{r}img/partita.jpg" />
  <link rel="alternate" hreflang="it" href="{SITE}{fname}" />
  <link rel="alternate" hreflang="en" href="{SITE}en/{fname}" />
  <link rel="icon" href="{r}favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="{r}apple-touch-icon.png" />
  <link rel="stylesheet" href="{r}style.css" />
</head>
<body>
  <header class="top">
    <div class="wrap">
      <a class="brand" href="index.html"><img src="{r}favicon.png" alt="" width="32" height="32" /><span>TFM <b>27</b><small>TACTIC F.C. MANAGER</small></span></a>
      <nav id="nav">
{nav}
      </nav>
      <div class="actions">
        {switch(fname)}
        <a class="btn sm gh" href="{REPO}" title="GitHub" aria-label="GitHub">{svg('code', 14)}</a>
        <a class="btn sm primary dl" href="{DL}">{svg('download', 14)} {x('Scarica per Windows', 'Download for Windows')} <small>{SIZE}</small></a>
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
          <a class="brand" href="index.html"><img src="{r}favicon.png" alt="" width="32" height="32" /><span>Tactic F.C. Manager</span></a>
          <p>{x('Gioco manageriale di calcio gratuito, in italiano e in inglese. Spogliatoio vivo, partite in 2D, storie che nascono dal campionato.',
                'A free football management game, in English and Italian. A living dressing room, 2D matches, stories that grow out of the league.')}</p>
          <p><span class="tag">GPL-3.0</span> <span class="tag cy">v{VERSION}</span></p>
        </div>
        <div><h4>{x('Il sito', 'The site')}</h4><ul>{''.join(f'<li><a href="{h}">{n}</a></li>' for h, n in nav_items())}</ul></div>
        <div><h4>{x('Documenti', 'Documents')}</h4><ul>
          <li><a href="{REPO}/blob/main/docs/release-notes.md">{x('Note di rilascio', 'Release notes')}</a></li>
          <li><a href="{REPO}/blob/main/docs/03-match-engine.md">{x('Come funziona il motore', 'How the engine works')}</a></li>
          <li><a href="{REPO}/blob/main/assets/LICENSES.md">{x('Licenze', 'Licences')}</a></li>
          <li><a href="{REPO}/blob/main/LICENSE">{x('Licenza GPL-3.0', 'GPL-3.0 licence')}</a></li>
        </ul></div>
        <div><h4>{x('Progetto', 'Project')}</h4><ul>
          <li><a href="{REPO}">{x('Codice sorgente', 'Source code')}</a></li>
          <li><a href="{REPO}/releases">{x('Tutte le versioni', 'All versions')}</a></li>
          <li><a href="{REPO}/issues">{x('Segnala un problema', 'Report a problem')}</a></li>
          <li><a href="{REPO}/discussions">{x('Discussioni', 'Discussions')}</a></li>
        </ul></div>
      </div>
      <div class="legal"><span>{x('© 2026 Tactic F.C. Manager · codice sotto licenza GNU GPL v3.0', '© 2026 Tactic F.C. Manager · code under the GNU GPL v3.0 licence')}</span><span>{x('Club e giocatori inventati · nessun dato raccolto', 'Invented clubs and players · no data collected')}</span></div>
    </div>
  </footer>
{CLIPS if 'data-src=' in body else ''}
</body>
</html>
'''
    folder = os.path.join(OUT, 'en') if LANG == 'en' else OUT
    os.makedirs(folder, exist_ok=True)
    io.open(os.path.join(folder, fname), 'w', encoding='utf-8', newline='\n').write(html)

def shot(img, alt, label, right=''):
    return f'<div class="shot"><div class="bar">{label}<span>{right}</span></div><img src="{R()}img/{img}" alt="{alt}" loading="lazy" /></div>'

def clip(name, poster_alt, label, right):
    # muta e in loop; si scarica e parte solo quando arriva sullo schermo (lo script CLIPS in fondo alla pagina)
    return (f'<div class="shot"><div class="bar">{label}<span>{right}</span></div>'
            f'<video data-src="{R()}clips/{name}.webm" muted loop playsinline preload="none" aria-label="{poster_alt}"></video></div>')

CLIPS = """<script>
const clips = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target;
  if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: 0.3 });
document.querySelectorAll('video[data-src]').forEach((v) => clips.observe(v));
</script>"""

def cta(title, text, second=None):
    second = second or ('download.html', x('Come si installa', 'How to install'))
    return f'''    <section>
      <div class="wrap">
        <div class="cta-box">
          <div><div class="kicker">{x('Pronto per la panchina?', 'Ready for the dugout?')}</div><h2>{title}</h2><p>{text}</p></div>
          <div class="row"><a class="btn" href="{second[0]}">{second[1]}</a><a class="btn primary big" href="{DL}">{svg('download')} {x('Scarica TFM 27', 'Download TFM 27')}</a></div>
        </div>
      </div>
    </section>'''

# ---------- HOME ----------
def home():
    body = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <img class="logo" src="{R()}img/logo.webp" alt="Tactic F.C. Manager" width="150" height="175" />
          <span class="pill g">{x('Versione', 'Version')} {VERSION} · {x('gratis', 'free')}</span>
          <h1>{x('Non alleni una rosa.<br /><span class="hl">Alleni un gruppo di persone.</span>', 'You don\'t manage a squad.<br /><span class="hl">You manage a group of people.</span>')}</h1>
          <p class="lead">{x('Tactic F.C. Manager è un gioco manageriale di calcio, gratuito, in italiano e in inglese. I tuoi giocatori hanno amici e rivali, un morale che contagia gli altri, promesse che si ricordano — e agenti che se le ricordano per loro.',
                             'Tactic F.C. Manager is a free football management game, in English and Italian. Your players have friends and rivals, a morale that spreads to the others, promises they remember — and agents who remember them too.')}</p>
          <div class="cta">
            <a class="btn primary big" href="{DL}">{svg('download')} {x('Scarica per Windows', 'Download for Windows')} <small>{SIZE}</small></a>
            <a class="btn big" href="caratteristiche.html">{x('Scopri il gioco', 'Discover the game')}</a>
          </div>
          <div class="fine">{x('Windows 10 e 11, 64 bit · niente pubblicità, niente account, niente internet', 'Windows 10 and 11, 64-bit · no ads, no account, no internet')}</div>
        </div>
        {shot('partita.jpg', x("Una partita dal vivo: il campo in 2D, la panchina e l'analista", 'A live match: the 2D pitch, the bench and the analyst'), x('partita dal vivo', 'live match'), '2D')}
      </div>
      <div class="wrap">
        <div class="stats">
          <div class="stat"><span>Club</span><b>40</b><p>{x('in Serie A e B, più una Serie C da cui si sale e in cui si scende', 'in Serie A and B, plus a Serie C that teams go up from and down to')}</p></div>
          <div class="stat"><span>{x('Storie', 'Stories')}</span><b class="cy">40</b><p>{x('tipi di storie che nascono da quello che succede', 'kinds of stories that grow out of what happens')}</p></div>
          <div class="stat"><span>{x('Ruoli in campo', 'Player roles')}</span><b>27</b><p>{x('ognuno cambia davvero il modo di muoversi', 'each one really changes how a player moves')}</p></div>
          <div class="stat"><span>{x('Prezzo', 'Price')}</span><b class="cy">0 €</b><p>{x('e il codice è pubblico, con licenza GPL-3.0', 'and the code is public, under the GPL-3.0 licence')}</p></div>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x("Cosa c'è dentro", "What's inside")}</div><h2>{x('Tutto quello che ti aspetti. Più quello che di solito resta nascosto.', 'Everything you expect. Plus what usually stays hidden.')}</h2>
          <p>{x('Tattica, allenamento, mercato, finanze — e le persone: rapporti, promesse, pressione dei giornali.', 'Tactics, training, transfers, finances — and the people: relationships, promises, pressure from the papers.')}</p></div>
        <div class="grid g4">
          <a class="panel" href="caratteristiche.html#spogliatoio">{ic('users')}<h3>{x('Spogliatoio vivo', 'A living dressing room')}</h3><p>{x('Amicizie, rivalità, leader. Il morale di uno arriva ai compagni.', "Friendships, rivalries, leaders. One player's morale reaches his team-mates.")}</p></a>
          <a class="panel" href="motore.html">{ic('route', 'cy')}<h3>{x('Partita in 2D', '2D match')}</h3><p>{x('Salienti o partita intera, replay dei gol, sovrapposizioni tattiche, panchina e analista.', 'Highlights or the full game, goal replays, tactical overlays, the bench and the analyst.')}</p></a>
          <a class="panel" href="caratteristiche.html#stampa">{ic('news', 'am')}<h3>{x('Storie e stampa', 'Stories and press')}</h3><p>{x('La crisi, la serie positiva, il predestinato. E le domande dei giornalisti.', 'The crisis, the winning run, the wonderkid. And the journalists\' questions.')}</p></a>
          <a class="panel" href="caratteristiche.html#mercato">{ic('search')}<h3>{x('Mercato con la nebbia', 'A market in the fog')}</h3><p>{x('Degli altri vedi solo stime. Gli osservatori sbagliano, gli agenti ricordano.', "You only see estimates of other clubs' players. Scouts get it wrong, agents remember.")}</p></a>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker">{x('La tua scrivania', 'Your desk')}</div>
          <h2>{x('Ogni mattina, quello che conta.', 'Every morning, what matters.')}</h2>
          <p>{x('Posizione, forma, cassa e morale in quattro numeri. La prossima partita con il pulsante per la formazione e quello per scendere in campo. Le notizie, la classifica, la guida della prima stagione.',
                'Position, form, cash and morale in four numbers. The next match, with one button for the line-up and one to take the field. The news, the table, the guide for your first season.')}</p>
          <ul class="checks">
            <li>{x('<b>Una prima partita guidata</b> in cinque passi, e ogni schermata si spiega la prima volta che la apri.', '<b>A guided first match</b> in five steps, and every screen explains itself the first time you open it.')}</li>
            <li>{x('<b>Coppa nazionale</b>, playoff e playout in Serie B, amichevoli estive, Primavera, nazionali con Europeo e Mondiale.', '<b>A national cup</b>, Serie B play-offs and play-out, summer friendlies, youth league, national teams with Euros and World Cup.')}</li>
            <li>{x('<b>In italiano e in inglese</b>, anche le storie e le conferenze stampa. Cinque slot di salvataggio, sul tuo computer.', '<b>In English and Italian</b>, stories and press conferences included. Five save slots, on your computer.')}</li>
          </ul>
        </div>
        {shot('scrivania.jpg', x('La scrivania con classifica, prossima partita e notizie', 'The desk with the table, the next match and the news'), x('scrivania', 'desk'))}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head c"><div class="kicker">{x('Guarda', 'Take a look')}</div><h2>{x('Come si presenta', 'What it looks like')}</h2></div>
        <div class="grid g3">
          {shot('tattica.jpg', x('La tattica con modulo e ruoli', 'Tactics with formation and roles'), x('tattica', 'tactics'))}
          {shot('spogliatoio.jpg', x('Il grafo dello spogliatoio', 'The dressing room graph'), x('spogliatoio', 'dressing room'))}
          {shot('mercato.jpg', x('La ricerca giocatori con stime', 'The player search with estimates'), x('mercato', 'transfers'))}
          {shot('storie.jpg', x('Una conferenza stampa', 'A press conference'), x('stampa', 'press'))}
          {shot('inizio.jpg', x('La scelta del club a inizio carriera', 'Choosing a club at the start of a career'), x('nuova carriera', 'new career'))}
          {shot('partita.jpg', x('La partita in 2D', 'The 2D match'), x('partita', 'match'))}
        </div>
      </div>
    </section>
{cta(x('Prendi il comando della tua squadra.', 'Take charge of your team.'), x('Gratis, senza pubblicità e senza account. Si installa in un minuto, senza permessi di amministratore.', 'Free, no ads and no account. Installs in a minute, without administrator rights.'))}'''
    page('index.html', x('Tactic F.C. Manager (TFM 27) — il gioco manageriale di calcio dove alleni persone', 'Tactic F.C. Manager (TFM 27) — the football management game where you manage people'),
         x('Tactic F.C. Manager è un gioco manageriale di calcio gratuito, in italiano e in inglese. Spogliatoio vivo, partite in 2D, mercato con agenti che ricordano, storie che nascono dal campionato.',
           'Tactic F.C. Manager is a free football management game, in English and Italian. A living dressing room, 2D matches, a market with agents who remember, stories that grow out of the league.'), body)

# ---------- CARATTERISTICHE ----------
def features():
    body = f'''    <div class="hero">
      <div class="wrap">
        <span class="pill g">{x('Caratteristiche', 'Features')} · TFM 27</span>
        <h1>{x('Ogni decisione lascia il segno:<br /><span class="hl">le caratteristiche di TFM 27.</span>', 'Every decision leaves a mark:<br /><span class="hl">the features of TFM 27.</span>')}</h1>
        <p class="lead">{x('Nessuna formula nascosta nei numeri. Giocatori con rapporti veri, osservatori con i loro pregiudizi e una tattica che si vede davvero in campo.',
                           'No formula hidden in the numbers. Players with real relationships, scouts with their own biases and tactics you can actually see on the pitch.')}</p>
        <div class="stats">
          <div class="stat"><span>{x('Spogliatoio', 'Dressing room')}</span><b>{x('Grafo', 'Graph')}</b><p>{x('ogni giocatore ha un rapporto con ciascun compagno', 'every player has a relationship with each team-mate')}</p></div>
          <div class="stat"><span>{x('Storie', 'Stories')}</span><b class="cy">40</b><p>{x('tipi di storie, con la stampa che ne parla', 'kinds of stories, with the press talking about them')}</p></div>
          <div class="stat"><span>{x('Attributi', 'Attributes')}</span><b>36</b><p>{x('da 1 a 20, più sei assi di personalità', 'from 1 to 20, plus six personality axes')}</p></div>
          <div class="stat"><span>{x('Tattica', 'Tactics')}</span><b class="cy">5 × 27</b><p>{x('moduli e ruoli, con istruzioni di squadra e individuali', 'formations and roles, with team and player instructions')}</p></div>
        </div>
      </div>
    </div>

    <section class="alt" id="spogliatoio">
      <div class="wrap split">
        <div class="text">
          <div class="kicker">{x('Pilastro 01 · Dinamiche interne', 'Pillar 01 · Squad dynamics')}</div>
          <h2>{x('Chi è amico di chi: <span class="hl">la psicologia non è un valore numerico fisso.</span>', 'Who is friends with whom: <span class="hl">psychology is not a fixed number.</span>')}</h2>
          <p>{x('Il morale va da 1 a 100, ma nessuno vive da solo: amicizie, rivalità, gruppi per nazionalità, leader che il resto della squadra ascolta. Una lite in allenamento può diventare una faida.',
                'Morale goes from 1 to 100, but nobody lives alone: friendships, rivalries, groups by nationality, leaders the rest of the squad listens to. A row in training can turn into a feud.')}</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>{x('Grafo dello spogliatoio', 'Dressing room graph')}</b><p>{x('Vedi chi comanda, chi è isolato e da dove parte il malumore prima che diventi una crisi.', 'See who is in charge, who is isolated and where the discontent starts before it becomes a crisis.')}</p></div></div>
            <div class="point"><i>→</i><div><b>{x('Promesse che si ricordano', 'Promises that are remembered')}</b><p>{x('Prometti spazio a un giovane e poi lo lasci in tribuna: se ne ricorda lui, e il suo agente al prossimo rinnovo.', 'Promise a youngster playing time and then leave him in the stands: he remembers, and so does his agent at the next renewal.')}</p></div></div>
          </div>
        </div>
        {shot('spogliatoio.jpg', x('Il grafo dello spogliatoio con leader e rapporti fra i giocatori', 'The dressing room graph with leaders and relationships between players'), x('spogliatoio', 'dressing room'), x('grafo', 'graph'))}
      </div>
    </section>

    <section>
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker cy">{x('Pilastro 02 · Tattica e ruoli', 'Pillar 02 · Tactics and roles')}</div>
          <h2>{x('Le scelte si vedono in campo: <span class="cy">niente algoritmi oscuri.</span>', 'Your choices show on the pitch: <span class="cy">no obscure algorithms.</span>')}</h2>
          <p>{x('Moduli, ruoli e istruzioni cambiano il modo in cui la squadra si muove. Un terzino che spinge lascia spazio dietro; una linea alta invita la palla in profondità. Lo vedi nel campo 2D, non in una tabella.',
                'Formations, roles and instructions change the way the team moves. An attacking full-back leaves space behind; a high line invites the ball over the top. You see it on the 2D pitch, not in a table.')}</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>{x('Istruzioni individuali e piani partita', 'Player instructions and match plans')}</b><p>{x('Chi tira, chi resta dietro, chi marca a uomo. E piani che scattano da soli: «se siamo sotto dal 70\', mentalità offensiva».', 'Who shoots, who stays back, who man-marks. And plans that kick in on their own: "if we\'re behind from the 70th minute, attacking mentality".')}</p></div></div>
            <div class="point"><i>→</i><div><b>{x("Partita dal vivo con l'analista", 'Live match with the analyst')}</b><p>{x("Durante la gara l'analista ti dice dove stai perdendo, e puoi cambiare senza fermare tutto.", "During the game the analyst tells you where you're losing it, and you can change things without stopping everything.")}</p></div></div>
          </div>
        </div>
        {shot('tattica.jpg', x('La schermata della tattica', 'The tactics screen'), x('tattica', 'tactics'), x('modulo', 'formation'))}
      </div>
    </section>

    <section class="alt" id="stampa">
      <div class="wrap split">
        <div class="text">
          <div class="kicker am">{x('Pilastro 03 · Storie e stampa', 'Pillar 03 · Stories and press')}</div>
          <h2>{x('Il campionato racconta: <span style="color:var(--amber)">oltre 40 storie vive.</span>', 'The league tells stories: <span style="color:var(--amber)">more than 40 living ones.</span>')}</h2>
          <p>{x('Le storie nascono da quello che succede: la crisi, la serie positiva, il ragazzo predestinato, la bestia nera che ti batte da tre anni. I giornalisti ti fanno domande su quelle storie.',
                'Stories grow out of what happens: the crisis, the winning run, the wonderkid, the bogey team that has beaten you for three years. Journalists ask you about those stories.')}</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>{x("Sai prima l'effetto delle risposte", 'You know what an answer does before you give it')}</b><p>{x('Ogni risposta mostra cosa sposta: il morale di un giocatore, i tifosi, la fiducia della dirigenza.', "Every answer shows what it moves: a player's morale, the fans, the board's trust.")}</p></div></div>
            <div class="point"><i>→</i><div><b>{x('Nella tua lingua', 'In your language')}</b><p>{x("Storie e conferenze stampa si scrivono in italiano o in inglese. Cambi lingua, e si riscrivono anche quelle già passate.", 'Stories and press conferences are written in English or Italian. Switch language, and the past ones are rewritten too.')}</p></div></div>
          </div>
        </div>
        {shot('storie.jpg', x('Una conferenza stampa con le risposte e i loro effetti', 'A press conference with the answers and their effects'), x('sala stampa', 'press room'))}
      </div>
    </section>

    <section id="mercato">
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker">{x('Pilastro 04 · Osservatori e mercato', 'Pillar 04 · Scouting and transfers')}</div>
          <h2>{x('Non sai mai tutto: <span class="hl">il mercato è una scommessa ponderata.</span>', 'You never know everything: <span class="hl">the market is a calculated bet.</span>')}</h2>
          <p>{x('Dei giocatori degli altri vedi solo stime, con la loro incertezza. Gli osservatori le rendono più precise — ma qualcuno sbaglia sempre nella stessa direzione, e un colpo può rivelarsi un bidone.',
                "You only see estimates of other clubs' players, with their uncertainty. Scouts make them more accurate — but some always err in the same direction, and a big signing can turn out a flop.")}</p>
          <div class="points">
            <div class="point"><i>→</i><div><b>{x('Trattative vere', 'Real negotiations')}</b><p>{x('Prezzo nascosto, pazienza che si consuma, rate, bonus, percentuale sulla rivendita, prestiti, parametro zero.', 'A hidden price, patience that runs out, instalments, bonuses, sell-on clauses, loans, free transfers.')}</p></div></div>
            <div class="point"><i>→</i><div><b>{x('Agenti con la memoria', 'Agents with a memory')}</b><p>{x('Se hai trattato male un loro assistito, lo sanno. E si fa sentire al tavolo.', "If you treated one of their clients badly, they know. And it shows at the table.")}</p></div></div>
          </div>
        </div>
        {shot('mercato.jpg', x('La ricerca giocatori con filtri e stime', 'The player search with filters and estimates'), x('mercato', 'transfers'), x('stime', 'estimates'))}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Le fondamenta', 'The foundations')}</div><h2>{x('I pilastri della gestione', 'The pillars of management')}</h2></div>
        <div class="grid g4">
          <div class="panel">{ic('sprout')}<h3>{x('Vivaio e Primavera', 'Academy and youth league')}</h3><p>{x("Ogni estate arriva un'annata di ragazzi, con l'anteprima di chi sta per arrivare. Ogni tanto, anche nel club più piccolo, un talento fuori dal comune.", "Every summer a new intake of youngsters arrives, with a preview of who's coming. Now and then, even at the smallest club, an exceptional talent.")}</p><div class="foot">{x('Campionato Primavera', 'Youth league')}</div></div>
          <div class="panel">{ic('coins', 'cy')}<h3>{x('Conti veri', 'Real accounts')}</h3><p>{x('Biglietti, diritti tv, sponsor, stipendi, rate dei trasferimenti. Cassa mese per mese e proiezione di fine stagione. Il fair play finanziario non perdona.', 'Tickets, TV rights, sponsors, wages, transfer instalments. Cash month by month and an end-of-season forecast. Financial fair play shows no mercy.')}</p><div class="foot">{x('Fair play finanziario', 'Financial fair play')}</div></div>
          <div class="panel">{ic('landmark', 'am')}<h3>{x('La dirigenza', 'The board')}</h3><p>{x("Ti dà un obiettivo, ma è un contratto: puoi chiedere due stagioni di tempo, e lo paghi subito in fiducia. Se la fiducia finisce, arriva l'esonero.", "It gives you a target, but it's a contract: you can ask for two seasons, and you pay for it in trust straight away. When the trust runs out, you're sacked.")}</p><div class="foot">{x('Obiettivi rinegoziabili', 'Renegotiable targets')}</div></div>
          <div class="panel">{ic('chart')}<h3>{x('Tre campionati', 'Three leagues')}</h3><p>{x('Serie A, Serie B con playoff e playout, Serie C. Chi spende troppo va in amministrazione controllata, con punti di penalizzazione.', 'Serie A, Serie B with play-offs and play-out, Serie C. Clubs that overspend go into administration, with a points deduction.')}</p><div class="foot">{x('Club che falliscono', 'Clubs that go bust')}</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Guida rapida', 'Quick guide')}</div><h2>{x('Come iniziare con TFM 27', 'Getting started with TFM 27')}</h2><p>{x('Nessun permesso di amministratore, nessun account.', 'No administrator rights, no account.')}</p></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>{x('Scarica', 'Download')}</h3><p>{x('Il file', 'The file')} <span class="mono">TFM27-Setup.exe</span> ({SIZE}) {x('dal pulsante in alto.', 'from the button at the top.')}</p></div>
          <div class="panel step"><span class="n">02</span><h3>{x('Avvia e conferma', 'Run and confirm')}</h3><p>{x('Se Windows mostra l\'avviso SmartScreen: «Ulteriori informazioni» e poi «Esegui comunque».', 'If Windows shows the SmartScreen warning: "More info" and then "Run anyway".')}</p></div>
          <div class="panel step"><span class="n">03</span><h3>{x('Scegli il club', 'Pick a club')}</h3><p>{x('Scegli la lingua, poi filtra i 40 club per campionato e ambizione, leggi il dossier e scegli la tua filosofia.', 'Choose your language, then filter the 40 clubs by league and ambition, read the dossier and pick your philosophy.')}</p></div>
          <div class="panel step"><span class="n">04</span><h3>{x('Segui la guida', 'Follow the guide')}</h3><p>{x('La prima stagione ti accompagna in cinque passi: formazione, allenamento, prima partita.', 'The first season walks you through five steps: line-up, training, first match.')}</p></div>
        </div>
      </div>
    </section>
{cta(x('Tocca a te.', 'Your turn.'), x('Tactic F.C. Manager è gratuito e libero, con licenza GPL-3.0. Nessun acquisto nel gioco.', 'Tactic F.C. Manager is free and open, under the GPL-3.0 licence. No in-game purchases.'), ('motore.html', x('Il motore della partita', 'The match engine')))}'''
    page('caratteristiche.html', x('Caratteristiche — Tactic F.C. Manager', 'Features — Tactic F.C. Manager'),
         x('Spogliatoio con rapporti veri, tattica che si vede in campo, 40 tipi di storie, mercato con stime e agenti che ricordano, tre campionati.',
           'A dressing room with real relationships, tactics you can see on the pitch, 40 kinds of stories, a market with estimates and agents who remember, three leagues.'), body)

# ---------- MOTORE ----------
def engine():
    body = f'''    <div class="hero">
      <div class="wrap">
        <span class="pill g">{x('Motore della partita · azione per azione', 'Match engine · move by move')}</span>
        <h1>{x('La partita in 2D:<br /><span class="hl">si gioca a carte scoperte.</span>', 'The 2D match:<br /><span class="hl">all the cards on the table.</span>')}</h1>
        <p class="lead">{x('Nessuna animazione di facciata sopra un risultato già deciso. Ogni passaggio, ogni pressing, ogni palla in profondità che vedi è quella che il motore ha appena calcolato.',
                           'No cosmetic animation on top of a result already decided. Every pass, every press, every ball over the top you see is the one the engine has just calculated.')}</p>
        <div class="stats">
          <div class="stat"><span>{x('Campo', 'Pitch')}</span><b>12 × 8</b><p>{x('zone continue: ogni giocatore corre, non si teletrasporta', 'continuous zones: every player runs, nobody teleports')}</p></div>
          <div class="stat"><span>{x('Visioni', 'Views')}</span><b class="cy">3</b><p>{x('Salienti (4-7 minuti), Estesa, Completa; tre telecamere', 'Highlights (4–7 minutes), Extended, Full; three cameras')}</p></div>
          <div class="stat"><span>{x('Decisioni', 'Decisions')}</span><b>{x('Ad ogni azione', 'On every move')}</b><p>{x('passaggio, profondità, dribbling, tiro o cross', 'pass, through ball, dribble, shot or cross')}</p></div>
          <div class="stat"><span>{x('Simulazione', 'Simulation')}</span><b class="cy">{x('Istantanea', 'Instant')}</b><p>{x('se non vuoi guardare, il risultato in un attimo', "if you don't want to watch, the result in a moment")}</p></div>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Guarda · novità della 0.2.0', 'Watch · new in 0.2.0')}</div><h2>{x('Tre azioni, registrate dal gioco', 'Three moves, recorded from the game')}</h2>
          <p>{x('Nessun montaggio: è il campo 2D come lo vedi giocando, telecamera che segue la palla.', "No editing: it's the 2D pitch as you see it when you play, with the camera following the ball.")}</p></div>
        <div class="grid g3">
          {clip('gol-azione', x('Un gol su azione', 'A goal from open play'), x('gol su azione', 'open-play goal'), 'clip')}
          {clip('gol-corner', x('Un gol da calcio d\'angolo', 'A goal from a corner'), x('gol da corner', 'corner goal'), 'clip')}
          {clip('parata', x('Una parata', 'A save'), x('parata', 'save'), 'clip')}
        </div>
        <div class="grid g4" style="margin-top:28px">
          <div class="panel">{ic('play')}<h3>{x('Replay', 'Replays')}</h3><p>{x('Gol e grandi occasioni tornano al rallentatore. Ogni saliente si rivede con un clic.', 'Goals and big chances come back in slow motion. Every highlight can be watched again with one click.')}</p></div>
          <div class="panel">{ic('activity', 'cy')}<h3>{x('Momenti animati', 'Animated moments')}</h3><p>{x("Dribbling, contrasto, colpo di testa, parata, uscita, respinta, fuorigioco: ognuno col suo gesto.", 'Dribble, tackle, header, save, keeper coming out, parry, offside: each with its own movement.')}</p></div>
          <div class="panel">{ic('route', 'am')}<h3>{x('Sovrapposizioni', 'Overlays')}</h3><p>{x("Linea e baricentro, rete dei passaggi, zone calde, pressing. Cambi un'istruzione e la forma di prima resta tratteggiata.", 'Line and shape, passing network, heatmap, pressing. Change an instruction and the old shape stays dashed.')}</p></div>
          <div class="panel">{ic('users')}<h3>{x('Leggibile', 'Readable')}</h3><p>{x("Il nome di chi ha la palla, l'ombra della palla alta, chi pressa. Maglie che non si confondono, la folla che reagisce.", 'The ball carrier\'s name, the high ball\'s shadow, who is pressing. Kits that never clash, a crowd that reacts.')}</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head"><div class="kicker">{x('La partita dal vivo', 'The live match')}</div><h2>{x('La console della panchina', 'The dugout console')}</h2>
          <p>{x("Il campo, i tabellini, la cronaca, l'inerzia della gara e l'analista, tutto nella stessa schermata. I cambi e le istruzioni che decidi contano davvero: il motore simula solo poco più avanti di quello che stai guardando.",
                "The pitch, the match stats, the commentary, the momentum and the analyst, all on one screen. The substitutions and instructions you decide really count: the engine only simulates a little ahead of what you're watching.")}</p></div>
        {shot('partita.jpg', x("Una partita dal vivo: il campo in 2D, la panchina e l'analista", 'A live match: the 2D pitch, the bench and the analyst'), x('partita dal vivo', 'live match'), x('motore L2', 'L2 engine'))}
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker cy">{x("L'analista", 'The analyst')}</div><h2>{x('Cosa succede, e perché', "What's happening, and why")}</h2>
          <p>{x("Durante i 90 minuti l'analista legge i dati per te e li trasforma in consigli: dove state perdendo il pallone, chi è stanco, quale corridoio lasciate aperto.",
                "For 90 minutes the analyst reads the data for you and turns it into advice: where you're losing the ball, who is tired, which channel you're leaving open.")}</p></div>
        <div class="grid g4">
          <div class="panel">{ic('activity')}<h3>{x('Inerzia', 'Momentum')}</h3><p>{x('Chi sta spingendo e da quanto: il grafico si riempie minuto per minuto.', "Who's pushing and for how long: the chart fills up minute by minute.")}</p></div>
          <div class="panel">{ic('target', 'cy')}<h3>{x('xG e tiri', 'xG and shots')}</h3><p>{x('La qualità delle occasioni, non solo il numero: un tiro da fuori non vale un rigore in movimento.', "The quality of chances, not just the count: a shot from distance isn't worth a tap-in.")}</p></div>
          <div class="panel">{ic('route', 'am')}<h3>{x('Passaggi e corridoi', 'Passes and channels')}</h3><p>{x('Da dove passa il gioco e dove lo perdete. Le mappe dei passaggi e delle zone calde.', 'Where the play goes through and where you lose it. Passing maps and heatmaps.')}</p></div>
          <div class="panel">{ic('chart')}<h3>{x('Duelli e pressing', 'Duels and pressing')}</h3><p>{x('Contrasti, recuperi, pressione sul portatore. Chi regge e chi sta cedendo.', "Tackles, recoveries, pressure on the ball carrier. Who's holding up and who's giving way.")}</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker">{x('Intervento tattico', 'Tactical changes')}</div>
          <h2>{x('Pausa tattica: <span class="hl">cambi la gara senza fermarla per sempre.</span>', 'Tactical pause: <span class="hl">change the game without stopping it for good.</span>')}</h2>
          <p>{x('Una pausa, e hai davanti tutto: mentalità, pressing, ampiezza, linea difensiva, verticalità. Cambi, ruoli, istruzioni individuali, e si riparte.', 'One pause and everything is in front of you: mentality, pressing, width, defensive line, directness. Substitutions, roles, player instructions, and play resumes.')}</p>
          <div class="points">
            <div class="point"><i>{svg('pause', 15)}</i><div><b>{x('Regolazioni rapide', 'Quick adjustments')}</b><p>{x('Cinque istruzioni di squadra e la mentalità, anche senza aprire la tattica completa.', 'Five team instructions and the mentality, without opening the full tactics screen.')}</p></div></div>
            <div class="point"><i>{svg('users', 15)}</i><div><b>{x('Cinque cambi e piani partita', 'Five substitutions and match plans')}</b><p>{x('Con condizione, voto e cartellini sotto gli occhi. I piani preparati prima scattano da soli, e il vice te lo dice.', 'With condition, rating and cards in front of you. Plans prepared beforehand kick in on their own, and your assistant tells you.')}</p></div></div>
            <div class="point"><i>{svg('mega', 15)}</i><div><b>{x('Indicazioni dalla panchina', 'Touchline instructions')}</b><p>{x('Incoraggia, chiedi di più, calma. Chi regge male la pressione, se gli chiedi di più, rende peggio.', 'Encourage, demand more, calm down. Players who handle pressure badly play worse if you demand more.')}</p></div></div>
          </div>
        </div>
        <div class="shot"><div class="bar">{x('console · correzioni rapide', 'console · quick adjustments')}<span>{x('in pausa', 'paused')}</span></div>
          <pre class="code">{CONSOLE[LANG]}</pre></div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap split rev">
        <div class="text">
          <div class="kicker am">{x('Per chi va di fretta', 'In a hurry?')}</div>
          <h2>{x('Simulazione istantanea e report finale', 'Instant simulation and final report')}</h2>
          <p>{x('Preferisci concentrarti su mercato, spogliatoio e bilancio? Simula la partita in un attimo: il risultato è lo stesso motore, le statistiche sono le stesse.',
                "Would you rather focus on transfers, the dressing room and the books? Simulate the match in a moment: it's the same engine, with the same statistics.")}</p>
          <ul class="checks">
            <li>{x("<b>Migliore in campo</b> e voti colorati per tutti (sopra l'8 in verde, sotto il 6 in rosso).", '<b>Player of the match</b> and colour-coded ratings for everyone (above 8 in green, below 6 in red).')}</li>
            <li>{x("<b>Statistiche a confronto</b>: possesso, tiri, xG, passaggi, contrasti, falli, calci d'angolo.", '<b>Side-by-side stats</b>: possession, shots, xG, passes, tackles, fouls, corners.')}</li>
            <li>{x('<b>Cronologia</b> di gol, cartellini, cambi e infortuni.', '<b>Timeline</b> of goals, cards, substitutions and injuries.')}</li>
          </ul>
        </div>
        {shot('tattica.jpg', x('La tattica, con modulo e ruoli', 'Tactics, with formation and roles'), x('prima della partita', 'before the match'))}
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Sotto il cofano', 'Under the bonnet')}</div><h2>{x('Come ragiona un giocatore col pallone', 'How a player on the ball thinks')}</h2></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>{x('Posizioni', 'Positions')}</h3><p>{x('Ognuno corre verso il suo posto ideale — modulo, ruolo, palla — a velocità limitata da Velocità, Accelerazione ed energia.', 'Everyone runs towards his ideal spot — formation, role, ball — at a speed limited by Pace, Acceleration and energy.')}</p></div>
          <div class="panel step"><span class="n">02</span><h3>{x('Pressione', 'Pressure')}</h3><p>{x('I difensori vicini pressano il portatore, secondo Sacrificio, energia e istruzioni.', 'Nearby defenders press the ball carrier, according to Work Rate, energy and instructions.')}</p></div>
          <div class="panel step"><span class="n">03</span><h3>{x('Opzioni', 'Options')}</h3><p>{x('Passaggio a ogni compagno, palla in profondità, dribbling, tiro, cross: ognuno con probabilità di riuscita e valore.', 'A pass to each team-mate, through ball, dribble, shot, cross: each with a chance of success and a value.')}</p></div>
          <div class="panel step"><span class="n">04</span><h3>{x('Scelta', 'Choice')}</h3><p>{x('Chi ha Decisioni alte sceglie quasi sempre bene. Sotto pressione e con poca Compostezza, sbaglia di più.', 'Players with high Decisions almost always choose well. Under pressure and with little Composure, they get it wrong more often.')}</p></div>
        </div>
        <p style="margin-top:22px">{x("Il morale, la condizione e le amicizie entrano in campo: fra due amici il passaggio arriva un po' più spesso. La spiegazione completa è in", 'Morale, condition and friendships come onto the pitch: between two friends the pass arrives a little more often. The full explanation (in Italian) is in')}
          <a href="{REPO}/blob/main/docs/03-match-engine.md">docs/03-match-engine.md</a>.</p>
      </div>
    </section>
{cta(x('Vivi la partita in prima persona.', 'Live the match first-hand.'), x('Disponibile gratis con licenza GPL-3.0, per Windows 10 e 11 a 64 bit.', 'Free under the GPL-3.0 licence, for 64-bit Windows 10 and 11.'))}'''
    page('motore.html', x('Motore 2D e partita — Tactic F.C. Manager', '2D engine and match — Tactic F.C. Manager'),
         x('La partita in 2D di Tactic F.C. Manager: ogni azione calcolata dal motore, salienti e replay, sovrapposizioni tattiche, panchina, analista e simulazione istantanea.',
           "Tactic F.C. Manager's 2D match: every move calculated by the engine, highlights and replays, tactical overlays, the bench, the analyst and instant simulation."), body)

CONSOLE = {
 'it': '''<span class="c">// quello che cambi qui entra nell'azione successiva</span>
<span class="k">mentalità</span>       <span class="n">4</span>  <span class="s">offensiva</span>
<span class="k">pressing</span>        <span class="n">2</span>  <span class="s">alto</span>
<span class="k">ampiezza</span>        <span class="n">2</span>  <span class="s">larga</span>
<span class="k">linea difensiva</span> <span class="n">1</span>  <span class="s">media</span>
<span class="k">verticalità</span>     <span class="n">2</span>  <span class="s">diretta</span>

<span class="c">// cambio</span>
<span class="k">esce</span>  MC  <span class="n">62%</span> condizione
<span class="k">entra</span> AMC <span class="n">98%</span> condizione''',
 'en': '''<span class="c">// what you change here applies from the next move</span>
<span class="k">mentality</span>       <span class="n">4</span>  <span class="s">attacking</span>
<span class="k">pressing</span>        <span class="n">2</span>  <span class="s">high</span>
<span class="k">width</span>           <span class="n">2</span>  <span class="s">wide</span>
<span class="k">defensive line</span>  <span class="n">1</span>  <span class="s">medium</span>
<span class="k">directness</span>      <span class="n">2</span>  <span class="s">direct</span>

<span class="c">// substitution</span>
<span class="k">off</span> MC  <span class="n">62%</span> condition
<span class="k">on</span>  AMC <span class="n">98%</span> condition''',
}

# ---------- DOWNLOAD ----------
def download():
    body = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <span class="pill g">{x('Versione', 'Version')} {VERSION}</span> <span class="pill">{x('GPL-3.0 · codice aperto', 'GPL-3.0 · open source')}</span>
          <h1>{x('Scarica TFM 27 e scendi <span class="hl">subito in panchina.</span>', 'Download TFM 27 and <span class="hl">take your seat on the bench.</span>')}</h1>
          <p class="lead">{x('Gira tutto sul tuo computer: nessun account, nessuna raccolta di dati, nessun costo nascosto.', 'Everything runs on your computer: no account, no data collection, no hidden costs.')}</p>
          <div class="grid g2" style="margin-top:26px">
            <div class="point"><i>{svg('shield', 15)}</i><div><b>{x('Offline e privato', 'Offline and private')}</b><p>{x('I salvataggi restano nel tuo computer.', 'Your saves stay on your computer.')}</p></div></div>
            <div class="point"><i>{svg('monitor', 15)}</i><div><b>{x('Leggero', 'Lightweight')}</b><p>{x('Nessuna scheda video speciale.', 'No special graphics card needed.')}</p></div></div>
          </div>
        </div>
        <div class="panel hi">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3>{svg('monitor', 18)} Windows {x('64 bit', '64-bit')}</h3><span class="tag">{VERSION}</span></div>
          <p style="margin-top:12px"><b class="mono" style="color:var(--text)">TFM27-Setup.exe</b> · {SIZE} · {x('versione', 'version')} {VERSION}</p>
          <a class="btn primary big" style="width:100%;justify-content:center;margin:16px 0" href="{DL}">{svg('download')} {x("Scarica l'installer", 'Download the installer')}</a>
          <div class="hash"><b>SHA-256</b>{SHA}</div>
          <p style="margin-top:10px;font-size:13px">{x('Per controllare il file scaricato, in PowerShell:', 'To check the downloaded file, in PowerShell:')} <span class="mono">Get-FileHash TFM27-Setup.exe</span>. {x('Il numero deve essere uguale.', 'The number must match.')}</p>
          <p style="margin-top:10px;font-size:13px"><a href="{REPO}/releases">{x('Tutte le versioni', 'All versions')}</a> · <a href="{REPO}">{x('Codice sorgente', 'Source code')}</a></p>
        </div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Installazione', 'Installation')}</div><h2>{x('Come installare TFM 27 in 4 passi', 'How to install TFM 27 in 4 steps')}</h2>
          <p>{x("L'installer è gratuito e non ancora firmato (il certificato di firma si paga): per questo Windows può mostrare un avviso la prima volta.", "The installer is free and not yet signed (a code-signing certificate costs money): that's why Windows may show a warning the first time.")}</p></div>
        <div class="grid g4">
          <div class="panel step"><span class="n">01</span><h3>{x('Scarica', 'Download')}</h3><p>{x('Premi il pulsante qui sopra e salva', 'Press the button above and save')} <span class="mono">TFM27-Setup.exe</span>.</p><div class="foot">{SIZE}</div></div>
          <div class="panel step"><span class="n">02</span><h3>{x('Avviso SmartScreen', 'SmartScreen warning')}</h3><p>{x('Se compare «Windows ha protetto il PC», clicca <b>Ulteriori informazioni</b> e poi <b>Esegui comunque</b>.', 'If "Windows protected your PC" appears, click <b>More info</b> and then <b>Run anyway</b>.')}</p><div class="foot">{x('codice pubblico e verificabile', 'public, verifiable code')}</div></div>
          <div class="panel step"><span class="n">03</span><h3>{x('Scegli la cartella', 'Choose the folder')}</h3><p>{x('Il gioco si installa nella tua cartella utente. Non servono permessi di amministratore.', 'The game installs in your user folder. No administrator rights needed.')}</p><div class="foot">{x('nessuna modifica al sistema', 'no changes to the system')}</div></div>
          <div class="panel step"><span class="n">04</span><h3>{x('Gioca', 'Play')}</h3><p>{x('Scegli la lingua, il club, la tua filosofia, e la prima stagione ti accompagna passo per passo.', 'Choose the language, the club and your philosophy, and the first season walks you through step by step.')}</p><div class="foot">{x('prima partita guidata', 'guided first match')}</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker cy">{x('Salvataggi', 'Saves')}</div>
          <h2>{x('Cinque slot, tutti sul tuo computer', 'Five slots, all on your computer')}</h2>
          <p>{x('Ogni slot ha un nome, la data di gioco e il tempo passato in panchina. La carriera si può esportare in un file', 'Each slot has a name, the in-game date and the time spent on the bench. A career can be exported to a')}
            <span class="mono">.dsa</span> {x('da tenere da parte o da portare su un altro computer.', 'file to keep aside or move to another computer.')}</p>
          <ul class="checks">
            <li>{x('I file sono in', 'The files are in')} <span class="mono">%APPDATA%\\talisman\\saves</span>, {x('con il pulsante per aprire la cartella.', 'with a button to open the folder.')}</li>
            <li>{x('Le carriere delle versioni precedenti si aprono: il formato si aggiorna da solo.', 'Careers from earlier versions open: the format updates itself.')}</li>
            <li>{x('Se qualcosa va storto, «Esporta diagnostica» crea un file che decidi tu se mandare.', 'If something goes wrong, "Export diagnostics" creates a file that you decide whether to send.')}</li>
          </ul>
        </div>
        <div class="panel">
          <h3>{x('Novità della', 'New in')} {VERSION}</h3>
          <ul class="checks">
            <li>{x('<b>Le nazionali giocano davvero</b>: partite col motore del gioco, marcatori e presenze vere.', '<b>National teams really play</b>: matches run by the game engine, real scorers and caps.')}</li>
            <li>{x('<b>La partita in 2D rifatta</b>: salienti, replay, sovrapposizioni tattiche, tre telecamere.', '<b>The 2D match rebuilt</b>: highlights, replays, tactical overlays, three cameras.')}</li>
            <li>{x('<b>Un motore più ricco</b>: dribbling, cross e duelli aerei, portiere, piazzati con schemi, fatica vera.', '<b>A richer engine</b>: dribbles, crosses and aerial duels, goalkeepers, set-piece routines, real fatigue.')}</li>
            <li>{x('<b>Istruzioni individuali</b> e <b>piani partita</b> che scattano da soli.', '<b>Player instructions</b> and <b>match plans</b> that kick in on their own.')}</li>
            <li>{x('<b>Tre campionati</b>, con playoff e playout in Serie B.', '<b>Three leagues</b>, with play-offs and play-out in Serie B.')}</li>
            <li>{x('<b>Club che falliscono</b> se spendono troppo.', '<b>Clubs that go bust</b> if they overspend.')}</li>
            <li>{x('<b>In inglese</b>: interfaccia, storie e conferenze stampa.', '<b>In English</b>: interface, stories and press conferences.')}</li>
          </ul>
          <div class="foot"><a href="{REPO}/blob/main/docs/release-notes.md">{x('Note di rilascio complete →', 'Full release notes →')}</a></div>
        </div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap split">
        <div>
          <div class="head"><div class="kicker">{x('Requisiti', 'Requirements')}</div><h2>{x('Cosa serve', 'What you need')}</h2></div>
          <div class="tbl"><table>
            <thead><tr><th>{x('Componente', 'Component')}</th><th>{x('Richiesto', 'Required')}</th></tr></thead>
            <tbody>
              <tr><td>{x('Sistema', 'System')}</td><td>{x('Windows 10 o 11, 64 bit', 'Windows 10 or 11, 64-bit')}</td></tr>
              <tr><td>{x('Memoria', 'Memory')}</td><td>{x('4 GB (8 GB consigliati)', '4 GB (8 GB recommended)')}</td></tr>
              <tr><td>{x('Scheda video', 'Graphics')}</td><td>{x('quella integrata basta', 'integrated graphics are enough')}</td></tr>
              <tr><td>{x('Spazio su disco', 'Disk space')}</td><td>{x('circa 400 MB, più i salvataggi', 'about 400 MB, plus saves')}</td></tr>
              <tr><td>Internet</td><td>{x('solo per scaricarlo', 'only to download it')}</td></tr>
            </tbody>
          </table></div>
        </div>
        <div class="panel">
          <h3>{svg('monitor', 18)} Linux {x('e', 'and')} Mac</h3>
          <p>{x('La versione Linux (AppImage) è pronta nel codice ma va costruita su un computer Linux: arriverà con una delle prossime versioni. Per Mac non c\'è ancora una data.', "The Linux version (AppImage) is ready in the code but has to be built on a Linux computer: it will come with one of the next versions. There's no date for Mac yet.")}</p>
          <p>{x('Chi usa Linux può già compilarla dal codice sorgente:', 'Linux users can already build it from the source code:')}</p>
          <pre class="code" style="border-radius:8px;margin-top:12px">pnpm install
pnpm dist:linux</pre>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head c"><div class="kicker">{x('Domande', 'Questions')}</div><h2>{x('Download e salvataggi', 'Download and saves')}</h2></div>
        <div class="faq">
          <details><summary>{x('È davvero gratis?', 'Is it really free?')}</summary><p>{x('Sì. Niente pubblicità, niente acquisti nel gioco, niente account. Il codice è pubblico con licenza GPL-3.0.', 'Yes. No ads, no in-game purchases, no account. The code is public under the GPL-3.0 licence.')}</p></details>
          <details><summary>{x('In che lingue è?', 'Which languages is it in?')}</summary><p>{x('Italiano e inglese. La lingua si sceglie alla prima apertura e si cambia quando vuoi dalle Impostazioni.', 'English and Italian. You choose the language at first launch and can change it any time in Settings.')}</p></details>
          <details><summary>{x("Perché Windows dice che l'editore è sconosciuto?", 'Why does Windows say the publisher is unknown?')}</summary><p>{x("Perché l'installer non è firmato: il certificato di firma si compra, e non l'abbiamo ancora preso. Puoi controllare che il file sia quello giusto con il codice SHA-256 qui sopra.", "Because the installer isn't signed: a code-signing certificate has to be bought, and we haven't got one yet. You can check the file is the right one with the SHA-256 code above.")}</p></details>
          <details><summary>{x('Il gioco manda i miei dati da qualche parte?', 'Does the game send my data anywhere?')}</summary><p>{x('No. Il gioco non si collega a internet. I salvataggi e il registro degli errori restano sul tuo computer.', "No. The game doesn't connect to the internet. Saves and the error log stay on your computer.")}</p></details>
          <details><summary>{x('Ci sono i club e i giocatori veri?', 'Are there real clubs and players?')}</summary><p>{x('No: club, città e giocatori sono inventati. Il formato del mondo è pensato perché, in futuro, chi vuole possa caricare dati propri.', 'No: clubs, towns and players are invented. The world format is designed so that, in future, anyone who wants to can load their own data.')}</p></details>
          <details><summary>{x('È una versione finita?', 'Is it a finished version?')}</summary><p>{x('È una versione in sviluppo: si giocano molte stagioni di fila, ma è il momento giusto per segnalare quello che non va. I limiti noti sono nelle', "It's a version in development: you can play many seasons in a row, but it's the right time to report what's wrong. Known limits are in the")} <a href="{REPO}/blob/main/docs/release-notes.md">{x('note di rilascio', 'release notes')}</a>.</p></details>
          <details><summary>{x('Come lo disinstallo?', 'How do I uninstall it?')}</summary><p>{x('Da Impostazioni → App di Windows, come ogni altro programma. I salvataggi restano in', 'From Windows Settings → Apps, like any other program. Saves stay in')} <span class="mono">%APPDATA%\\talisman</span>: {x('cancellali a mano se non ti servono più.', "delete them by hand if you don't need them any more.")}</p></details>
        </div>
      </div>
    </section>
{cta(x('Vuoi guardare dentro il codice?', 'Want to look inside the code?'), x('Tutto il gioco è su GitHub: motore, interfaccia, bilanciamento e documenti di progetto.', "The whole game is on GitHub: engine, interface, balancing and design documents."), (REPO, x('Codice su GitHub', 'Code on GitHub')))}'''
    page('download.html', x('Download e guida — Tactic F.C. Manager', 'Download and guide — Tactic F.C. Manager'),
         x(f'Scarica Tactic F.C. Manager per Windows: installer gratuito da {SIZE}, installazione in 4 passi, salvataggi locali, domande frequenti.',
           f'Download Tactic F.C. Manager for Windows: a free {SIZE} installer, installation in 4 steps, local saves, frequently asked questions.'), body)

# ---------- COMMUNITY ----------
def community():
    body = f'''    <div class="hero">
      <div class="wrap split">
        <div>
          <span class="pill g">{x('GPL-3.0 · codice aperto · zero dati', 'GPL-3.0 · open source · zero data')}</span>
          <h1>{x('Costruito in chiaro,<br /><span class="hl">libero per sempre.</span>', 'Built in the open,<br /><span class="hl">free forever.</span>')}</h1>
          <p class="lead">{x('Tactic F.C. Manager è un gioco manageriale trasparente: il motore, le regole e il bilanciamento sono pubblici e leggibili riga per riga.', 'Tactic F.C. Manager is a transparent management game: the engine, the rules and the balancing are public and readable line by line.')}</p>
          <div class="cta">
            <a class="btn primary big" href="{REPO}/issues">{svg('bug')} {x('Segnala un problema', 'Report a problem')}</a>
            <a class="btn big" href="{REPO}">{svg('code')} {x('Codice su GitHub', 'Code on GitHub')}</a>
          </div>
        </div>
        <div class="shot"><div class="bar">{x('terminale', 'terminal')}<span>GPL-3.0</span></div>
          <pre class="code"><span class="c">$</span> git clone <span class="s">{REPO}</span>
<span class="c">$</span> pnpm install
<span class="c">$</span> pnpm sim -- --seasons <span class="n">10</span> --seed <span class="n">42</span>
<span class="k">{x('stagioni', 'seasons')}</span>       <span class="n">10</span>
<span class="k">{x('gol a partita', 'goals per game')}</span>  <span class="n">{SIM_GOALS[LANG]}</span>
<span class="k">{x('pareggi', 'draws')}</span>        <span class="n">{SIM_DRAWS[LANG]}</span>
<span class="c">{x('# il laboratorio di bilanciamento: gira in Node,', '# the balancing lab: it runs in Node,')}</span>
<span class="c">{x("# senza interfaccia, con lo stesso motore del gioco", '# with no interface, on the same engine as the game')}</span></pre></div>
      </div>
    </div>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Principi del progetto', 'Project principles')}</div><h2>{x('Un gioco che rispetta te e i tuoi dati', 'A game that respects you and your data')}</h2></div>
        <div class="grid g4">
          <div class="panel">{ic('code')}<h3>{x('Licenza GPL-3.0', 'GPL-3.0 licence')}</h3><p>{x('Libero di studiarlo, modificarlo e ridistribuirlo. Nessuna parte del motore è segreta.', 'Free to study, modify and redistribute. No part of the engine is secret.')}</p><div class="foot">{x('Codice trasparente', 'Transparent code')}</div></div>
          <div class="panel">{ic('wifioff', 'cy')}<h3>Offline</h3><p>{x('Nessun launcher, nessun account, nessuna connessione richiesta per giocare.', 'No launcher, no account, no connection needed to play.')}</p><div class="foot">{x('Totale autonomia', 'Fully standalone')}</div></div>
          <div class="panel">{ic('save', 'am')}<h3>{x('Salvataggi locali', 'Local saves')}</h3><p>{x('File sul tuo disco, esportabili in un file solo. Facili da copiare o tenere da parte.', 'Files on your disk, exportable to a single file. Easy to copy or keep aside.')}</p><div class="foot">{x('5 slot + esportazione', '5 slots + export')}</div></div>
          <div class="panel">{ic('eyeoff')}<h3>{x('Zero telemetria', 'Zero telemetry')}</h3><p>{x('Nessun tracciamento. La diagnostica si crea solo se la chiedi tu, e decidi tu a chi mandarla.', 'No tracking. Diagnostics are only created if you ask, and you decide who to send them to.')}</p><div class="foot">{x('Privacy di base', 'Privacy by default')}</div></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap split">
        <div class="text">
          <div class="kicker cy">{x('Dati e modding', 'Data and modding')}</div>
          <h2>{x('Un mondo in un formato aperto', 'A world in an open format')}</h2>
          <p>{x('Il gioco genera club, città e giocatori inventati. Il formato del mondo è lo stesso che userà il database della community: chi vorrà potrà caricare i propri campionati. Nomi e stemmi reali non li distribuiamo noi — li carica chi li possiede.',
                "The game generates invented clubs, towns and players. The world format is the same one the community database will use: anyone who wants to will be able to load their own leagues. We don't distribute real names and crests — whoever owns them loads them.")}</p>
          <div class="points">
            <div class="point"><i>01</i><div><b>{x('Esporta la carriera', 'Export your career')}</b><p>{x('Un file solo con tutto il mondo, da condividere o riprendere altrove.', 'A single file with the whole world, to share or pick up elsewhere.')}</p></div></div>
            <div class="point"><i>02</i><div><b>{x('Stemmi generati', 'Generated crests')}</b><p>{x('Colori e forme nascono dal gioco: nessuna immagine esterna.', 'Colours and shapes come from the game: no external images.')}</p></div></div>
            <div class="point"><i>03</i><div><b>{x('Migrazioni', 'Migrations')}</b><p>{x('Ogni cambio di formato ha la sua conversione: i salvataggi vecchi si riaprono.', 'Every format change has its own conversion: old saves open again.')}</p></div></div>
          </div>
        </div>
        <div class="shot"><div class="bar">{x('un club nel formato del mondo', 'a club in the world format')}<span>JSON</span></div>
          <pre class="code">{{
  <span class="k">"name"</span>: <span class="s">"Virtus Roccabianca"</span>,
  <span class="k">"city"</span>: <span class="s">"Roccabianca"</span>,
  <span class="k">"colors"</span>: [<span class="s">"#1f7a4d"</span>, <span class="s">"#f2f2f2"</span>, <span class="s">"#0f131d"</span>],
  <span class="k">"crest"</span>: <span class="n">null</span>, <span class="c">{x('// null = stemma generato', '// null = generated crest')}</span>
  <span class="k">"reputation"</span>: <span class="n">62</span>,
  <span class="k">"stadium"</span>: {{ <span class="k">"name"</span>: <span class="s">"Stadio Comunale"</span>, <span class="k">"capacity"</span>: <span class="n">14200</span> }},
  <span class="k">"tactic"</span>: {{ <span class="k">"formation"</span>: <span class="s">"4-3-3"</span>, <span class="k">"mentality"</span>: <span class="n">3</span>, <span class="c">…</span> }},
  <span class="k">"playerIds"</span>: [<span class="n">412</span>, <span class="n">413</span>, <span class="n">414</span>, <span class="c">…</span>]
}}</pre></div>
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="head"><div class="kicker">{x('Strada fatta, strada da fare', 'Road travelled, road ahead')}</div><h2>Roadmap</h2>
          <p>{x('Il gioco è costruito a fasi, ognuna provata prima di passare alla successiva.', 'The game is built in phases, each one tested before moving on to the next.')}</p></div>
        <div class="grid g3 road">
          <div class="panel done"><span class="tag">{x('Fatto', 'Done')} · 0.1</span><h3>{x('Il gioco completo e il collaudo', 'The complete game and first testing')}</h3><p>{x('Motore partita e campo 2D, spogliatoio, mercato e osservatori, storie e stampa, finanze e dirigenza, vivaio e nazionali, coppa e Primavera, installer per Windows.', 'Match engine and 2D pitch, dressing room, transfers and scouting, stories and press, finances and board, academy and national teams, cup and youth league, Windows installer.')}</p></div>
          <div class="panel now"><span class="tag cy">{x('Adesso', 'Now')} · {VERSION}</span><h3>{x('La partita', 'The match')}</h3><p>{x('Partita 2D rifatta, motore più ricco, istruzioni individuali e piani partita, tre campionati con playoff e playout, club che falliscono, il gioco in inglese.', 'A rebuilt 2D match, a richer engine, player instructions and match plans, three leagues with play-offs and play-out, clubs that go bust, the game in English.')}</p></div>
          <div class="panel next"><span class="tag am">{x('Dopo', 'Next')} · 1.0</span><h3>{x("Più campionati e l'editor", 'More leagues and the editor')}</h3><p>{x('Versione Linux, altre leghe, un editor per il mondo e i database della community, statistiche storiche.', 'A Linux version, more leagues, an editor for the world and community databases, historical statistics.')}</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="head c"><div class="kicker">{x('Partecipa', 'Get involved')}</div><h2>{x('Come dare una mano', 'How to help')}</h2><p>{x('Non serve saper programmare: la cosa più utile è giocare e raccontare cosa non torna.', "You don't need to know how to code: the most useful thing is to play and tell us what doesn't add up.")}</p></div>
        <div class="grid g3">
          <div class="panel">{ic('bug')}<h3>{x('Segnala un problema', 'Report a problem')}</h3><p>{x('Qualcosa si blocca, un numero non torna, una schermata non si capisce: apri una segnalazione. Se puoi, allega il file di «Esporta diagnostica».', 'Something freezes, a number doesn\'t add up, a screen is unclear: open a report. If you can, attach the "Export diagnostics" file.')}</p>
            <p style="margin-top:14px"><a class="btn sm primary" href="{REPO}/issues/new">{x('Apri una segnalazione', 'Open a report')}</a></p></div>
          <div class="panel">{ic('book', 'cy')}<h3>{x('Racconta la tua stagione', 'Tell us about your season')}</h3><p>{x('Cosa racconteresti a un amico? Cosa ti ha annoiato? Le risposte dicono dove investire per la 1.0.', 'What would you tell a friend? What bored you? The answers tell us where to invest for 1.0.')}</p>
            <p style="margin-top:14px"><a class="btn sm" href="{REPO}/discussions">{x('Discussioni', 'Discussions')}</a></p></div>
          <div class="panel">{ic('git', 'am')}<h3>{x('Guarda il codice', 'Read the code')}</h3><p>{x('TypeScript, React ed Electron. Il motore è puro e ha i suoi test; il bilanciamento si misura con il laboratorio', 'TypeScript, React and Electron. The engine is pure and has its own tests; balancing is measured with the')} <span class="mono">pnpm sim</span>{x('.', ' lab.')}</p>
            <p style="margin-top:14px"><a class="btn sm" href="{REPO}">{x('Apri il repository', 'Open the repository')}</a></p></div>
        </div>
      </div>
    </section>
{cta(x('Scendi in campo.', 'Take the field.'), x(f'Scarica la {VERSION} e dicci cosa ne pensi.', f'Download {VERSION} and tell us what you think.'))}'''
    page('community.html', x('Community e note — Tactic F.C. Manager', 'Community and notes — Tactic F.C. Manager'),
         x('Tactic F.C. Manager è aperto (GPL-3.0), offline e senza telemetria. Roadmap, formato del mondo e come partecipare.',
           'Tactic F.C. Manager is open (GPL-3.0), offline and without telemetry. Roadmap, world format and how to get involved.'), body)

for LANG in ('it', 'en'):
    home(); features(); engine(); download(); community()
print('ok')
