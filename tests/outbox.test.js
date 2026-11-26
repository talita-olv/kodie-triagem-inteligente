import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Outbox } from '../src/outbox.js';

const item = {solicitacao_id:'SOL-01',resumo:'Falha de bomba.',setor:'ELETROMECANICA',fila:'fila-emec',prioridade:'P1',categoria:'CORRETIVA',status:'PENDENTE_TRIAGEM_HUMANA',revisao_humana:true};

test('fila persiste JSONL e impede duplicacao por ID, inclusive concorrente', async () => {
  const dir = await mkdtemp(join(tmpdir(),'kodie-'));
  try {
    const box = new Outbox(dir);
    await box.init();
    const resultados = await Promise.all([box.save(item),box.save(item)]);
    assert.equal(resultados.filter(r=>r.gravado).length,1);
    assert.equal(box.list().length,1);
    const loaded = new Outbox(dir);
    await loaded.init();
    assert.equal(loaded.list().length,1);
    assert.equal(loaded.list()[0].prioridade,'P1');
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('rejeita fila inconsistente com setor', async () => {
  const box = new Outbox('/tmp');
  assert.throws(()=>box.validate({...item,fila:'fila-automacao'}),/invalidos/);
});
