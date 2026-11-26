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

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(publicDir, { index: 'index.html', dotfiles: 'deny' }));
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
/**
 * Encaminha uma solicitacao ao Webhook de teste do n8n local.
 * Mantem a chave API_ACCESS_KEY somente entre navegador e Express.
 * O fluxo no n8n possui suas proprias credenciais para falar com a API.
 */
app.post('/api/fluxo-n8n', secured, async (req, res, next) => {
  try {
    const solicitacao = validateSolicitacao(req.body);
    let upstream;
    try {
      upstream = await fetch('http://127.0.0.1:5678/webhook-test/kodie-triagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitacao),
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      throw new AppError(502, 'N8N_INDISPONIVEL', 'n8n local nao respondeu. Inicie o n8n e ative Listen for test event no Webhook.');
    }
    if (!upstream.ok) {
      throw new AppError(502, 'FALHA_FLUXO_N8N', 'O workflow n8n respondeu com HTTP ' + upstream.status + '. Verifique os nodes e a escuta do Webhook.');
    }
    let result;
    try { result = await upstream.json(); }
    catch { throw new AppError(502, 'RESPOSTA_N8N_INVALIDA', 'O n8n nao devolveu JSON. Confira o node de resposta.'); }
    if (!result || result.ok !== true || !result.protocolo) {
      throw new AppError(502, 'RESPOSTA_N8N_INVALIDA', 'O fluxo n8n nao devolveu o protocolo esperado.');
    }
    res.json(result);
  } catch (error) { next(error); }
});
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
