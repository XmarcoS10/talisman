# ADR 0002 — Motore partita L2

**Data:** 18/09/2026 · **Stato:** accettato

## Contesto
GUIDA §6 e prompt P4: motore a zone con decisioni softmax, xG, tattiche, statistiche, voti, target §6.7.

## Scelte
1. **L2 per tutte le partite.** Non ci sono ancora leghe "lontane": il risolutore L0 è stato rimosso (resta in git, commit c9a1892).
2. **Coordinate continue** sulla griglia 12×8, non celle discrete: più semplice e pronta per il 2D.
3. **Posizioni con inerzia** (corsa a velocità limitata) invece che ricalcolate: senza, la mentalità offensiva era
   sempre la migliore perché non esistevano contropiedi.
4. **Valore del possesso K** nell'utilità: la teoria xT pura spinge a verticalizzare sempre; K rende le squadre prudenti
   quanto quelle reali (79% di passaggi riusciti, ~410 passaggi a squadra).
5. **Tattica ridotta per ora:** 5 moduli, mentalità, 5 istruzioni di squadra. Rimandati alla schermata Tattica (F4):
   i ~25 ruoli con tendenze, le istruzioni individuali, la familiarità tattica, i piani partita.
6. **Cambi e mentalità dell'IA automatici** anche per il club dell'utente finché non c'è la panchina interattiva (F6).
7. **Voti e statistiche** salvati nel risultato di ogni partita; heatmap e rete di passaggi rimandate al pannello analista (F6),
   perché salvarle per 760 partite a stagione non serve.

## Conseguenze
Salvataggi alla versione 2 (migrazione testata). Tutti i target per partita del §6.7 sono rispettati.
Mancano: velocità del benchmark da 10.000 partite, equilibrio del 5-3-2, varietà dei campioni su più stagioni
(dipende dalla dinamica del mondo: mercato F7, rotazioni F5).
