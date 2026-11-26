import { AppError } from './errors.js';
import { AI_SCHEMA, SYSTEM_PROMPT } from './prompt.js';
import { CATEGORIAS, SETORES, URGENCIAS } from './constants.js';

export function validateAIOutput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError(502, 'RESPOSTA_IA_INVALIDA', 'A IA nao retornou um objeto.');
  }
  if (!CATEGORIAS.includes(data.categoria) || !URGENCIAS.includes(data.urgencia) || !SETORES.includes(data.setor) ||
      typeof data.resumo !== 'string' || !data.resumo.trim() || data.resumo.length > 240 ||
      typeof data.justificativa !== 'string' || !data.justificativa.trim() || data.justificativa.length > 500 ||
      typeof data.revisao_humana !== 'boolean') {
    throw new AppError(502, 'RESPOSTA_IA_INVALIDA', 'A IA devolveu campos fora do formato acordado.');
  }
  return {
    categoria: data.categoria,
    urgencia: data.urgencia,
    setor: data.setor,
    resumo: data.resumo.trim(),
    justificativa: data.justificativa.trim(),
    revisao_humana: data.revisao_humana,
  };
}

/** Modo de demonstracao local, intencionalmente SEM inteligencia artificial. */
export function classifyMock(solicitacao) {
  const raw = solicitacao.descricao.toLocaleLowerCase('pt-BR');
  let categoria = /preventiv|inspe[cç][aã]o/.test(raw) ? 'PREVENTIVA' : /clp|automa[cç][aã]o|melhoria|implementar/.test(raw) ? 'MELHORIA' : /d[uú]vida|como consultar/.test(raw) ? 'DUVIDA' : 'CORRETIVA';
  let setor = /clp|automa[cç][aã]o/.test(raw) ? 'AUTOMACAO' : /planej|programa[cç][aã]o/.test(raw) ? 'PCM' : /atendimento|d[uú]vida/.test(raw) ? 'ATENDIMENTO' : 'ELETROMECANICA';
  return validateAIOutput({
    categoria, setor, urgencia: 'MEDIA',
    resumo: solicitacao.descricao.slice(0, 240),
    justificativa: 'Classificacao simulada por palavras-chave; nao e inferencia de IA.',
    revisao_humana: true,
  });
}

export async function classifyLive(solicitacao, { fetchImpl = fetch, env = process.env } = {}) {
  const key = env.OPENAI_API_KEY;
  if (!key || key === 'coloque_sua_chave_aqui') {
    throw new AppError(503, 'CHAVE_IA_AUSENTE', 'Configure OPENAI_API_KEY para executar a integracao real.');
  }
  let res;
  try {
    res = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        instructions: SYSTEM_PROMPT,
        input: JSON.stringify({ descricao: solicitacao.descricao, unidade: solicitacao.unidade, origem: solicitacao.origem }),
        store: false,
        text: { format: { type: 'json_schema', name: 'triagem_manutencao', strict: true, schema: AI_SCHEMA } },
      }),
      signal: AbortSignal.timeout(Number(env.OPENAI_TIMEOUT_MS || 25000)),
    });
  } catch {
    throw new AppError(502, 'IA_INDISPONIVEL', 'Falha de conexao ou timeout na API de IA.');
  }
  if (!res.ok) {
    throw new AppError(502, 'IA_INDISPONIVEL', `API de IA respondeu com HTTP ${res.status}. Consulte as configuracoes e limites.`);
  }
  let payload;
  try { payload = await res.json(); } catch { throw new AppError(502, 'RESPOSTA_IA_INVALIDA', 'Corpo da API de IA nao e JSON.'); }
  const txt = payload.output_text || payload.output?.flatMap(item => item.content || [])?.find(item => item.type === 'output_text')?.text;
  if (!txt || payload.status === 'incomplete') {
    throw new AppError(502, 'RESPOSTA_IA_INVALIDA', 'A IA nao gerou uma classificacao estruturada completa.');
  }
  try { return validateAIOutput(JSON.parse(txt)); }
  catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(502, 'RESPOSTA_IA_INVALIDA', 'A resposta de IA nao contem JSON valido.');
  }
}

export async function classify(solicitacao, options = {}) {
  const env = options.env || process.env;
  if (env.AI_MODE === 'mock') return classifyMock(solicitacao);
  if (env.AI_MODE && env.AI_MODE !== 'live') throw new AppError(500, 'CONFIG_INVALIDA', 'AI_MODE deve ser live ou mock.');
  return classifyLive(solicitacao, options);
}
