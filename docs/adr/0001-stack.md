# ADR 0001 — Stack "Talisman snello"

**Data:** 18/09/2026 · **Stato:** accettato

## Contesto
GUIDA §3 prevede monorepo pnpm, Tailwind, Zustand, TanStack, Zod, husky, CI. Il codice lo scrive Claude direttamente
(non Marco con prompt copiati), e C: non ha spazio: il progetto vive in `D:\Fm27`.

## Scelta
Electron + React 19 + TypeScript strict + Vite + Vitest, **un solo package** con i confini come cartelle
(`src/engine`, `src/sim-cli`, `src/ui`). Il sim-cli gira con Node 24 senza build (type stripping).

Regole della guida mantenute: motore isolato (verificato da test), PRNG seeded, i18n, salvataggi versionati, sim-cli, costanti in un file.

Rimandati finché non servono davvero:
| Cosa | Quando |
|---|---|
| TanStack Table/Virtual | rose/scouting con migliaia di righe (F7) |
| Web Worker per il motore | quando un avanzamento supera ~100 ms (motore L2, F3) |
| Zod | import del database della community |
| Salvataggi .tal su file (preload Electron) | più carriere / database esterni |
| Monorepo, husky, CI | se il progetto passa a più persone |
| Tailwind | mai, se i token CSS bastano |

Attributi: griglia di FM (14 tecnici incluso Calci d'angolo, 14 mentali + i 3 nostri, 6 fisici, 9 portiere) invece di quella
del §4.3, che ripeteva Posizionamento/Anticipazione tra tecnici e mentali.

## Conseguenze
Prima build giocabile in una sessione invece che dopo F0-F4. Ogni voce rimandata ha un punto preciso in cui entra.
