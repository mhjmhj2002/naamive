/**
 * Catálogo oficial de Status da entidade Necessidade.
 * Conforme documentacao/necessidade/06_STATUS_DA_NECESSIDADE.md
 * Status responde ONDE a Necessidade está no ciclo de vida;
 * NÃO representa conclusão de auditoria, recomendação, estratégia ou decisão humana.
 */
export enum StatusNecessidade {
  EM_FORMACAO = "EM_FORMACAO",
  EM_QUALIFICACAO = "EM_QUALIFICACAO",
  AGUARDANDO_DECISAO = "AGUARDANDO_DECISAO",
  EM_PROJETO = "EM_PROJETO",
  ATENDIDA = "ATENDIDA",
  CANCELADA = "CANCELADA",
}

/**
 * Catálogo oficial de Resultados do Processo da Necessidade.
 * Conforme documentacao/necessidade/07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md
 */
export enum TipoResultadoProcesso {
  // Auditoria de formação
  QUALIFICAVEL = "QUALIFICAVEL",
  PRECISA_DE_ESCLARECIMENTO = "PRECISA_DE_ESCLARECIMENTO",
  PRECISA_DE_DECOMPOSICAO = "PRECISA_DE_DECOMPOSICAO",
  NAO_CARACTERIZA_NECESSIDADE = "NAO_CARACTERIZA_NECESSIDADE",

  // Estratégia / determinação operacional
  NENHUM_TRATAMENTO_ADICIONAL = "NENHUM_TRATAMENTO_ADICIONAL",

  // Recomendação do agente
  ASSUMIR_COMPROMISSO = "ASSUMIR_COMPROMISSO",
  NAO_ASSUMIR_COMPROMISSO = "NAO_ASSUMIR_COMPROMISSO",
}

/**
 * Decisões humanas materiais do Owner.
 * Apenas o Owner autenticado pode produzir.
 */
export enum DecisaoMaterialOwner {
  APROVADO = "APROVADO",
  CANCELAMENTO_APROVADO = "CANCELAMENTO_APROVADO",
}

/**
 * Tipos de Necessidade suportados pelo modelo.
 * Conforme documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md
 */
export enum TipoNecessidade {
  NOVO_PRODUTO = "NOVO_PRODUTO",
  EVOLUCAO_DE_PRODUTO = "EVOLUCAO_DE_PRODUTO",
}

/**
 * Atores competentes conhecidos na vertical de Necessidade.
 * Conforme documentacao/necessidade/03_ATORES_DA_NECESSIDADE.md
 */
export enum AtorCompetenteNecessidade {
  ESPECIALISTA_FORMACAO = "Especialista em Formação da Necessidade",
  AUDITOR_NECESSIDADE = "Auditor da Necessidade",
  ESPECIALISTA_QUALIFICACAO = "Especialista em Qualificação da Necessidade",
  OWNER = "Owner",
  ESPECIALISTA_FORMACAO_PROJETO = "Especialista em Formação do Projeto",
}
