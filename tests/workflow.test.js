import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('workflow importavel possui entrada, API, registro e resposta',async()=>{
  const raw = await readFile(new URL('../n8n/fluxo_triagem_kodie.json',import.meta.url),'utf8');
  const w = JSON.parse(raw);
  assert.equal(w.nodes.length,6);
  assert.ok(w.nodes.some(n=>n.type.endsWith('.webhook')));
  assert.equal(w.nodes.filter(n=>n.type.endsWith('.httpRequest')).length,2);
  assert.ok(w.nodes.some(n=>n.type.endsWith('.respondToWebhook')));
  for(const n of w.nodes.slice(0,-1)) assert.ok(w.connections[n.name]?.main?.[0]?.length);
  assert.ok(!raw.includes('sk-proj-'));
});
