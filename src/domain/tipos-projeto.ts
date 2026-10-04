/**
 * Catálogo oficial de tipos, status, etapas e resultados da vertical Projeto.
 * Em estrita conformidade com:
 * - documentacao/projeto/02_MODELO_DE_PROJETO.md
 * - documentacao/projeto/03_ATORES_DO_PROJETO.md
 * - documentacao/projeto/04_FORMACAO_DO_PROJETO.md
 * - documentacao/projeto/05_CICLO_DE_VIDA_DO_PROJETO.md
 * - documentacao/projeto/06_STATUS_DO_PROJETO.md
 * - documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md
 */

/**
 * Catálogo oficial de Status da entidade Projeto.
 * Conforme documentacao/projeto/06_STATUS_DO_PROJETO.md
 * Status responde ONDE o Projeto está no ciclo de vida;
 * NÃO representa etapa de formação, conclusão de auditoria ou decisão humana.
 */
export enum StatusProjeto {
  EM_FORMACAO = "EM_FORMACAO",
  FORMADO = "FORMADO",
  CONCLUIDO = "CONCLUIDO",
  CANCELADO = "CANCELADO",
}

/**
 * Etapas internas do processo de Formação do Projeto.
 * Conforme documentacao/projeto/04_FORMACAO_DO_PROJETO.md
 * Não são status, são etapas de trabalho conduzidas pelo Especialista em Formação do Projeto.
 */
export enum EtapaFormacaoProjeto {
  ENQUADRAMENTO = "ENQUADRAMENTO",
  DESCOBERTA = "DESCOBERTA",
  DIRECAO_DA_SOLUCAO = "DIREÇÃO DA SOLUÇÃO",
}

/**
 * Catálogo oficial de Resultados do Processo da entidade Projeto.
 * Conforme documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md
 */
export enum TipoResultadoProcessoProjeto {
  // Auditoria de formação
  FORMACAO_SUFICIENTE = "FORMACAO_SUFICIENTE",
  FORMACAO_INSUFICIENTE = "FORMACAO_INSUFICIENTE",

  // Verificação agregada final
  COMPROMISSO_ATENDIDO = "COMPROMISSO_ATENDIDO",
  COMPROMISSO_NAO_ATENDIDO = "COMPROMISSO_NAO_ATENDIDO",
}

/**
 * Decisão humana material do Owner para Projeto.
 * Conforme documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md
 */
export enum DecisaoMaterialOwnerProjeto {
  CANCELAMENTO_APROVADO = "CANCELAMENTO_APROVADO",
}

/**
 * Atores competentes conhecidos na vertical de Projeto.
 * Conforme documentacao/projeto/03_ATORES_DO_PROJETO.md
 */
export enum AtorCompetenteProjeto {
  ESPECIALISTA_FORMACAO_PROJETO = "Especialista em Formação do Projeto",
  AUDITOR_PROJETO = "Auditor do Projeto",
  VERIFICADOR_AGREGADO_PROJETO = "Verificador Agregado do Projeto",
  ESPECIALISTA_DELIMITACAO_MODULOS = "Especialista em Delimitação de Módulos",
  OWNER = "Owner",
}
