/**
 * Catálogo oficial de tipos, enums e constantes do domínio de Contexto e Rastreabilidade.
 * Em estrita conformidade com:
 * - documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md
 * - dados/entregas-de-valor/EV-004/entrega-de-valor.md
 * - dados/modulos/M-004/modulo.md
 */

/**
 * Tipos de entidades mapeadas no percurso da jornada do NAAMIVE.
 */
export enum TipoEntidadeContexto {
  NECESSIDADE = "NECESSIDADE",
  PROJETO = "PROJETO",
  MODULO = "MODULO",
  ENTREGA_DE_VALOR = "ENTREGA_DE_VALOR",
  ITEM_DE_TRABALHO = "ITEM_DE_TRABALHO",
  GOVERNANCA = "GOVERNANCA",
}

/**
 * Tipos de registros preservados no histórico de proveniência.
 */
export enum TipoRegistroProveniencia {
  EVIDENCIA = "EVIDENCIA",
  DECISAO_HUMANA = "DECISAO_HUMANA",
  RESULTADO_PROCESSO = "RESULTADO_PROCESSO",
  TRANSICAO_STATUS = "TRANSICAO_STATUS",
  VINCULO_CAUSAL = "VINCULO_CAUSAL",
  HANDOFF = "HANDOFF",
}

/**
 * Classificação epistêmica da informação contextual preservada.
 * Garante que hipóteses ou propostas não sejam tratadas inadvertidamente como fatos conhecidos.
 */
export enum ClassificacaoEpistemica {
  CONHECIDO = "CONHECIDO",
  INFERIDO = "INFERIDO",
  PROPOSTO = "PROPOSTO",
  DESCONHECIDO = "DESCONHECIDO",
}

/**
 * Relações causais direcionadas no grafo de rastreabilidade.
 */
export enum TipoRelacaoCausal {
  ORIGINADO_DE = "ORIGINADO_DE",
  HABILITADO_POR = "HABILITADO_POR",
  SUSTENTADO_POR = "SUSTENTADO_POR",
  SUBSTITUI = "SUBSTITUI",
  DEPENDE_DE = "DEPENDE_DE",
}

/**
 * Finalidades declaradas para recuperação proporcional de contexto.
 */
export enum FinalidadeContexto {
  FORMAR_ENTREGA = "FORMAR_ENTREGA",
  AUDITAR_FORMACAO = "AUDITAR_FORMACAO",
  DESPACHAR_TRABALHO = "DESPACHAR_TRABALHO",
  EXECUTAR_ITEM = "EXECUTAR_ITEM",
  VERIFICAR_RESULTADO = "VERIFICAR_RESULTADO",
  AUDITAR_GOVERNANCA = "AUDITAR_GOVERNANCA",
  INSPECAO_GERAL = "INSPECAO_GERAL",
}

/**
 * Diagnóstico de anomalias epistemológicas e rastreabilidade na recuperação.
 */
export enum DiagnosticoContexto {
  CONSISTENTE = "CONSISTENTE",
  LACUNA_DETECTADA = "LACUNA_DETECTADA",
  CONTRADICAO_DETECTADA = "CONTRADICAO_DETECTADA",
}
