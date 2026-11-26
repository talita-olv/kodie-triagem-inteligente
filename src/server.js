import express from 'express';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';
import { classify } from './ai.js';
import { validateSolicitacao } from './validation.js';
import { triage } from './rules.js';
import { Outbox } from './outbox.js';

const env = process.env;
if (!env.API_ACCESS_KEY || env.API_ACCESS_KEY.startsWith('troque_')) {
  console.error('Defina API_ACCESS_KEY no ambiente antes de iniciar o servidor.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
const dataDir = resolve(env.DATA_DIR || './data');
const outbox = new Outbox(dataDir);
await outbox.init();

function secured(req, res, next) {
  const supplied = req.get('x-api-key') || '';
  const expected = env.API_ACCESS_KEY;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ erro: 'NAO_AUTORIZADO' });
  next();
}

app.get('/health', (req, res) => res.json({ status: 'ok', ia: env.AI_MODE === 'mock' ? 'mock' : 'live', provedor: env.AI_MODE === 'mock' ? 'simulacao' : (env.AI_PROVIDER || 'openai') }));
app.post('/api/analisar', secured, async (req, res, next) => {
  try {
    const solicitacao = validateSolicitacao(req.body);
    const classificacao = await classify(solicitacao);
    res.json(triage(solicitacao, classificacao, env.AI_MODE || 'live'));
  } catch (error) { next(error); }
});
app.post('/api/encaminhamentos', secured, async (req, res, next) => {
  try {
    const { registro, gravado } = await outbox.save(req.body);
    res.status(gravado ? 201 : 200).json({ ok: true, novo: gravado, ...registro });
  } catch (error) { next(error); }
});
app.get('/api/encaminhamentos', secured, (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  res.json({ total: outbox.ids.size, registros: outbox.list(limit) });
});
app.use((error, req, res, next) => {
  if (error instanceof AppError) return res.status(error.status).json({ erro: error.code, mensagem: error.message });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ erro: 'JSON_INVALIDO' });
  console.error('Erro interno:', error.message);
  res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: 'Nao foi possivel completar a requisicao.' });
});
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`API em http://localhost:${port} | IA: ${env.AI_MODE || 'live'}`));
}
export { app };
