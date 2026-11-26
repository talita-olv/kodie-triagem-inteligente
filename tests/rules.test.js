import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSolicitacao } from '../src/validation.js';
import { classifyMock, classifyLive, classifyGeminiLive, classify, validateAIOutput } from '../src/ai.js';
import { triage } from '../src/rules.js';
import { FILAS } from '../src/constants.js';

const ai = { categoria: 'CORRETIVA', urgencia: 'MEDIA', setor: 'ELETROMECANICA', resumo: 'Relato resumido', justificativa: 'Relato aponta uma falha.', revisao_humana: false };
const item = { id: 'T-01', descricao: 'Solicitamos avaliacao de falha no painel de comando da unidade.', unidade: 'Teste', origem: 'teste' };

test('validacao: aceita solicitacao valida e recusa descricao vazia', () => {
  const s = validateSolicitacao(item);
  assert.equal(s.unidade, 'Teste');
  assert.throws(() => validateSolicitacao({descricao:'curta'}), /descricao/);
  assert.throws(() => validateSolicitacao({descricao:12}), /descricao/);
});
test('classificador mock e claramente identificado como simulado', () => {
  const mock = classifyMock(item);
  assert.equal(mock.revisao_humana, true);
  assert.equal(triage(item, mock, 'mock').modo, 'SIMULACAO_SEM_IA');
});
test('prioridade critica na parada de bombeamento', () => {
  const s = { ...item, descricao: 'A elevatoria esta parada e sem bombeamento depois de uma falha.' };
  const r = triage(s, ai);
  assert.equal(r.decisao.prioridade, 'P1');
  assert.equal(r.decisao.fila, 'fila-emec');
  assert.equal(r.decisao.revisao_humana, true);
});
test('encaminha risco de choque a seguranca e mantem revisao humana', () => {
  const r = triage({ ...item, descricao: 'Foi identificado risco de choque elétrico na sala de painéis.'}, ai);
  assert.equal(r.decisao.setor, 'SEGURANCA');
  assert.equal(r.decisao.prioridade, 'P1');
});
test('sem unidade gera revisao humana', () => {
  const r = triage({ ...item, unidade: '' }, ai);
  assert.equal(r.decisao.status, 'PENDENTE_TRIAGEM_HUMANA');
});
test('setor sugerido gera fila padronizada', () => {
  const r = triage(item, { ...ai, setor: 'AUTOMACAO' });
  assert.equal(r.decisao.fila, FILAS.AUTOMACAO);
});
test('resposta de IA invalida e recusada', () => {
  assert.throws(() => validateAIOutput({ ...ai, urgencia: 'SUPER_CRITICA' }), /formato/);
});
test('integracao HTTP real estruturada: teste do cliente com rede simulada', async () => {
  let recorded;
  const returned = await classifyLive(item, {
    env: { OPENAI_API_KEY: 'fake_for_unit_test', OPENAI_MODEL: 'gpt-4o-mini' },
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      recorded = JSON.parse(init.body);
      return { ok: true, json: async () => ({output:[{content:[{type:'output_text',text:JSON.stringify(ai)}]}]}) };
    }
  });
  assert.equal(returned.categoria, 'CORRETIVA');
  assert.equal(recorded.text.format.type, 'json_schema');
  assert.equal(recorded.text.format.strict, true);
  assert.equal(recorded.store, false);
});
test('falha externa nao e convertida silenciosamente em resultado simulado', async () => {
  await assert.rejects(() => classifyLive(item, {env:{OPENAI_API_KEY:'fake'}, fetchImpl:async()=>{throw Error('offline')}}), /Falha de conexao/);
});

test('Gemini envia instrucao, JSON Schema e classifica resposta real simulada de rede', async () => {
  let request;
  const response = await classifyGeminiLive(item, {
    env: { GEMINI_API_KEY: 'fake_gemini_test', GEMINI_MODEL: 'gemini-3.5-flash-lite' },
    fetchImpl: async (url, init) => {
      assert.match(url, /gemini-3\.5-flash-lite:generateContent$/);
      assert.equal(init.headers['x-goog-api-key'], 'fake_gemini_test');
      request = JSON.parse(init.body);
      return { ok: true, json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(ai) }] } }]
      }) };
    }
  });
  assert.equal(response.categoria, 'CORRETIVA');
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.responseJsonSchema.type, 'object');
  assert.ok(request.systemInstruction.parts[0].text.includes('TRIAGEM'));
});
test('AI_PROVIDER=gemini encaminha corretamente, sem cair no modo mock', async () => {
  const response = await classify(item, {
    env: { AI_MODE: 'live', AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'fake_for_test' },
    fetchImpl: async () => ({ ok: true, json: async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(ai) }] } }]
    }) })
  });
  assert.equal(response.revisao_humana, false);
});
test('Gemini rejeita falta de credenciais e erros HTTP sem retornar simulacao', async () => {
  await assert.rejects(
    () => classifyGeminiLive(item, { env: {} }),
    /Configure GEMINI_API_KEY/
  );
  await assert.rejects(
    () => classifyGeminiLive(item, { env: { GEMINI_API_KEY: 'fake_for_test' }, fetchImpl: async () => ({ ok: false, status: 429 }) }),
    /HTTP 429/
  );
});
test('Gemini rejeita JSON incompleto e prioridade fora do contrato', async () => {
  await assert.rejects(
    () => classifyGeminiLive(item, { env: { GEMINI_API_KEY: 'fake_for_test' }, fetchImpl: async () => ({
      ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(ai) }] } }] })
    }) }), /nao concluiu/
  );
  await assert.rejects(
    () => classifyGeminiLive(item, { env: { GEMINI_API_KEY: 'fake_for_test' }, fetchImpl: async () => ({
      ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ ...ai, setor: 'INEXISTENTE' }) }] } }] })
    }) }), /formato/
  );
});
