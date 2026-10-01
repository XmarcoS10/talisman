#!/usr/bin/env bash
# Batteria di bilanciamento (motore-v2 §13): partite isolate e stagioni su tre semi, una carriera. Medie in fondo.
# Uso: bash tools/battery.sh > risultato.txt   (circa 10 minuti)
for s in 42 7 99; do
  pnpm sim -- --matches 10000 --seed $s 2>&1 | grep -E "Gol per|Pareggi|più forte" | sed "s/^/partite $s /"
  pnpm sim -- --seasons 10 --seed $s 2>&1 | grep -E "Gol per|Pareggi|Correlazione|Punti massimi" | sed "s/^/stagioni $s /"
done
pnpm sim -- --career 25 --seed 42 2>&1 | grep -E "Correlazione|Distacco|Bancarotte" | sed "s/^/carriera 42 /"
