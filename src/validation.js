import { randomUUID } from 'node:crypto';
import { AppError } from './errors.js';

function textField(value, name, max, { required = false, min = 0 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(400, 'DADOS_INVALIDOS', `Campo ${name} e obrigatorio.`);
    return '';
  }
  if (typeof value !== 'string') throw new AppError(400, 'DADOS_INVALIDOS', `Campo ${name} deve ser texto.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new AppError(400, 'DADOS_INVALIDOS', `Campo ${name} deve ter entre ${min} e ${max} caracteres.`);
  }
  return clean;
}

export function validateSolicitacao(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'DADOS_INVALIDOS', 'Envie um objeto JSON.');
  }
  const id = textField(body.id, 'id', 80) || randomUUID();
  const descricao = textField(body.descricao, 'descricao', 4000, { required: true, min: 15 });
  return {
    id,
    descricao,
    unidade: textField(body.unidade, 'unidade', 150),
    origem: textField(body.origem, 'origem', 80),
    recebido_em: new Date().toISOString(),
  };
}
