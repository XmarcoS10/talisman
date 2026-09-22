# Workflow di ComfyUI

Qui vanno i workflow **in formato API** (in ComfyUI: menu → *Export (API)*; l'*Export* normale è un altro file e non va).

- `base-sdxl.json` — il grafo di base di ComfyUI (SDXL, testo → immagine). Funziona subito con `sd_xl_base_1.0`.
- `sfondi.json`, `illustrazioni.json` — da esportare dai tuoi workflow W1 (FLUX) e W2 (SDXL + IP-Adapter) del
  Blocco C §2. Poi nel job cambia `workflow:` e i `nodeBindings` coi numeri dei nodi del tuo grafo: li vedi aprendo
  il JSON (ogni chiave in cima è un nodo; `"6": {"class_type": "CLIPTextEncode", ...}` → `6.inputs.text`).
