import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('interface publica formulario, campos obrigatorios, estilos e script', async () => {
  const html = await read('../public/index.html');
  assert.match(html, /id="form-solicitacao"/);
  assert.match(html, /id="solicitacao-descricao"/);
  assert.match(html, /id="api-key"/);
  assert.match(html, /name="execution-mode" value="n8n"/);
  assert.match(html, /name="execution-mode" value="api"/);
  assert.match(html, /src="\/app\.js"/);
  assert.match(html, /href="\/styles\.css"/);
  assert.doesNotMatch(html, /sk-proj-[A-Za-z0-9]/);
});

test('interface conecta API e n8n, sem persistir a chave no browser', async () => {
  const [script, server] = await Promise.all([
    read('../public/app.js'), read('../src/server.js')
  ]);
  assert.match(script, /\/api\/analisar/);
  assert.match(script, /\/api\/encaminhamentos/);
  assert.match(script, /\/api\/fluxo-n8n/);
  assert.match(server, /express\.static\(publicDir/);
  assert.match(server, /\/webhook-test\/kodie-triagem/);
  assert.match(server, /app\.post\('\/api\/fluxo-n8n', secured/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|GEMINI_API_KEY|OPENAI_API_KEY/);
});
