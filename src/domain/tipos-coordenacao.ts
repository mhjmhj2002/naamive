/**
 * Catálogo oficial de tipos, condições operacionais e contratos da Coordenação do Trabalho.
 * Em estrita conformidade com:
 * - documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md
 * - dados/entregas-de-valor/EV-003/entrega-de-valor.md
 * - dados/modulos/M-003/modulo.md
 */

/**
 * Condições operacionais do fluxo de trabalho na Coordenação do Trabalho.
 * Conforme Especificação da EV-003 e migração 005_esquema_coordenacao_trabalho.sql.
 * NOTA: Condição operacional é estado de fluxo de trabalho do motor de coordenação
 * e não se confunde com os Status normativos das entidades de governança.
 */
export enum CondicaoOperacionalTrabalho {
  POSSIVEL = "POSSIVEL",
  PREPARADO = "PREPARADO",
  EM_EXECUCAO = "EM_EXECUCAO",
  BLOQUEADO = "BLOQUEADO",
  AGUARDANDO_DECISAO_HUMANA = "AGUARDANDO_DECISAO_HUMANA",
  ENCERRADO = "ENCERRADO",
}

/**
 * Atores conhecidos e competências na Coordenação.
 */
export enum AtorCompetenteCoordenacao {
  OPERADOR = "Operador",
  OWNER = "Owner",
  MOTOR_COORDENACAO = "Motor de Coordenação do Trabalho",
}
