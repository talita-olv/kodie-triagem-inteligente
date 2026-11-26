export const CATEGORIAS = ['CORRETIVA', 'PREVENTIVA', 'MELHORIA', 'DUVIDA', 'OUTROS'];
export const URGENCIAS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
export const SETORES = ['ELETROMECANICA', 'AUTOMACAO', 'OPERACAO', 'PCM', 'SEGURANCA', 'ATENDIMENTO'];
export const FILAS = Object.freeze({
  ELETROMECANICA: 'fila-emec',
  AUTOMACAO: 'fila-automacao',
  OPERACAO: 'fila-operacao',
  PCM: 'fila-planejamento',
  SEGURANCA: 'fila-seguranca',
  ATENDIMENTO: 'fila-atendimento',
});
export const NIVEL_POR_URGENCIA = Object.freeze({ BAIXA: 'P4', MEDIA: 'P3', ALTA: 'P2', CRITICA: 'P1' });
