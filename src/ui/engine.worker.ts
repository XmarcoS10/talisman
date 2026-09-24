// Worker del motore: riceve il mondo come testo, fa avanzare il calendario e lo restituisce (engine-ops.ts).
import { handle, type Req } from './engine-ops.ts';

self.onmessage = (e: MessageEvent<{ id: number; req: Req }>) => {
  const { id, req } = e.data;
  try {
    self.postMessage({ id, res: handle(req) });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? `${err.message}\n${err.stack}` : String(err) });
  }
};
