/**
 * Catálogo oficial de tipos, enums e constantes do domínio de Verificação de Software.
 * Em estrita conformidade com:
 * - documentacao/modulo/01_DEFINICAO_DO_MODULO.md a 07_RESULTADOS_DO_PROCESSO_DO_MODULO.md (M-005)
 * - dados/modulos/M-005/modulo.md
 * - dados/entregas-de-valor/EV-005/entrega-de-valor.md
 * - migrations/007_esquema_verificacao_software.sql
 */

/**
 * Métodos de observação técnica admissíveis para critérios verificáveis.
 */
export enum MetodoObservacao {
  SUITE_AUTOMATIZADA = "SUITE_AUTOMATIZADA",
  INSPECAO_HTTP = "INSPECAO_HTTP",
  CONFORMIDADE_ESQUEMA = "CONFORMIDADE_ESQUEMA",
  OPERACIONAL = "OPERACIONAL",
}

/**
 * Conclusões técnicas de verificação e conformidade técnica.
 * Constituem categorias internas explicáveis de avaliação de conformidade;
 * NÃO se confundem com Resultados do Processo formais e NÃO autorizam presunção de sucesso.
 */
export enum ConclusaoVerificacao {
  CRITERIO_DEMONSTRADO = "CRITERIO_DEMONSTRADO",
  CRITERIO_NAO_DEMONSTRADO = "CRITERIO_NAO_DEMONSTRADO",
  EVIDENCIA_INSUFICIENTE = "EVIDENCIA_INSUFICIENTE",
  VERIFICACAO_IMPOSSIVEL = "VERIFICACAO_IMPOSSIVEL",
  DIVERGENCIA_ENCONTRADA = "DIVERGENCIA_ENCONTRADA",
}
