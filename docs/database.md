# Database della community

Tactic F.C. Manager esce con un mondo **inventato**: club, città, giocatori e stemmi sono generati dal gioco. Un
database della community è un file che sostituisce quel mondo con un altro — per esempio quello vero — e si carica
dalla nuova carriera (**Nuova carriera → Carica un database**).

**Il gioco e questo repository non contengono e non distribuiranno mai nomi, stemmi o dati reali.** Chi prepara un
database e lo condivide ne è responsabile: nomi, volti, stemmi e statistiche di club e calciatori possono essere
protetti da marchi, diritti d'immagine o dalle condizioni del sito da cui vengono. Il gioco legge il file sul tuo
computer e non si collega a internet.

## Come si parte

Il modo più semplice: **Nuova carriera → Esporta questo mondo**. Salva il mondo generato in un file
`database-2026.json` già nel formato giusto, con tutti i campi compilati. Lo riscrivi (a mano o con uno script) e lo
ricarichi con **Carica un database**. Il gioco controlla tutto il file prima di usarlo e, se qualcosa non va, elenca i
problemi con il punto esatto (`leagues[0].clubs[3].players[12].attrs: attributi conosciuti, interi 1-20`).

## Il formato (versione 1)

Un file JSON, al massimo 40 MB.

```json
{
  "format": "talisman-db",
  "version": 1,
  "name": "Il mio database",
  "season": 2026,
  "leagues": [
    { "id": "ITA1", "name": "Serie A", "clubs": [ ... 20 club ... ] },
    { "id": "ITA2", "name": "Serie B", "clubs": [ ... 20 club ... ] },
    { "id": "ITA3", "name": "Serie C", "clubs": [ ... 20 club ... ] }
  ]
}
```

La struttura dei campionati è fissa in questa versione: tre categorie da venti club, nell'ordine ITA1, ITA2, ITA3 (i
nomi li scegli tu). La terza categoria si gioca «d'ombra» come nel gioco normale.

### Club

| Campo | Obbligatorio | Valori |
|---|---|---|
| `name` | sì | 1-40 caratteri |
| `short` | no | sigla di 2-4 lettere (altrimenti dalla città) |
| `city` | sì | 1-40 caratteri, diversa per ogni club |
| `colors` | sì | tre colori `#rrggbb`: prima maglia, seconda, dettagli |
| `crest` | no | stemma come data URL PNG, JPEG o WebP (`data:image/png;base64,...`), al massimo ~220 KB. Niente SVG: può contenere script. Senza stemma il gioco ne disegna uno |
| `founded` | no | anno 1850-2100 |
| `reputation` | sì | 1-100: guida tifosi, incassi, sponsor, attese della dirigenza |
| `stadium` | no | `{ "name": "...", "capacity": 500-150000 }` |
| `balance` | no | cassa in euro |
| `players` | sì | da 16 a 45 giocatori, almeno 2 portieri |

### Giocatore

| Campo | Obbligatorio | Valori |
|---|---|---|
| `first`, `last` | sì | nome (1-30) e cognome (1-40) |
| `born` | sì | anno di nascita |
| `nation` | sì | codice di tre lettere maiuscole (`ITA`, `FRA`, `ENG`...) |
| `position` | sì | ruolo naturale: `GK DL DC DR DM ML MC MR AML AMC AMR ST` |
| `positions` | no | altri ruoli con la familiarità 1-5, `{ "MC": 4 }` |
| `foot` | no | `L`, `R` o `B` (entrambi) |
| `height` | no | cm, 150-215 |
| `attrs` | uno dei due | attributi 1-20 (elenco sotto); quelli che mancano si generano attorno ad `ability` |
| `ability` | uno dei due | abilità attuale 1-200, se non dai tutti gli attributi |
| `potential` | no | potenziale 1-200 (mai sotto l'abilità) |
| `personality` | no | `ambition professionalism loyalty temperament sociability pressureTolerance`, 1-20 |
| `wage` | no | stipendio in euro all'anno (altrimenti lo stima il gioco) |
| `until` | no | stagione di scadenza del contratto |
| `release` | no | clausola rescissoria in euro |

**Attributi** (1-20). Tecnici: `corners crossing dribbling finishing firstTouch freeKicks heading longShots marking
passing penalties tackling technique`. Mentali: `aggression anticipation bravery composure concentration decisions
determination flair leadership offTheBall positioning teamwork vision workRate tacticalAdaptability resilience
socialInfluence`. Fisici: `acceleration agility balance pace stamina strength`. Portiere: `aerialReach commandOfArea
communication handling kicking oneOnOnes reflexes rushingOut eccentricity`.

Come orientarsi con `ability`: in un mondo generato un titolare di una grande di Serie A sta fra 150 e 175, uno di
metà classifica fra 120 e 145, uno di Serie B fra 90 e 120, uno di Serie C fra 60 e 95.

### Cosa genera il gioco

Quello che il file non dice lo genera il mondo dal seme, come in una carriera normale: attributi mancanti,
personalità, carattere nascosto (predisposizione agli infortuni), morale e rapporti nello spogliatoio, agenti,
osservatori, calendario, coppa. I ragazzi dei vivai che arrivano negli anni successivi sono inventati.

### Limiti di questa versione

- Solo la piramide a tre categorie da venti club.
- Le nazionali si giocano per le 12 nazioni che il gioco conosce (`ITA ESP FRA BRA ARG POR NED SRB CRO SEN NGA
  SWE`): i giocatori di altre nazioni ci sono e giocano nei club, ma non vengono convocati.
