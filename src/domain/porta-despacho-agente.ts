import { HandoffCoordenacao } from "./coordenacao.js";

/**
 * Resultado do acionamento/despacho do agente através da porta.
 */
export interface ResultadoDespachoAgente {
  sucesso: boolean;
  tokenCorrelacao: string;
  ator: string;
  skill?: string | null | undefined;
  mensagemRetorno?: string | undefined;
  resultadoObservavel?: string | undefined;
  pendenciasOuBloqueios?: string | null | undefined;
}

/**
 * Porta de Despacho de Agentes (Domain Port).
 * Define a interface de comunicação do domínio e despachante autônomo com executores/runtimes de agentes.
 * Isola a infraestrutura de acionamento agêntico das regras de negócio do NAAMIVE.
 */
export interface PortaDespachoAgente {
  /**
   * Executa ou delega a ativação de um Ator agêntico com base no Handoff recebido.
   * Injeta no contexto do agente os dados da demanda, a Skill operacional e os critérios observáveis de término.
   */
  despacharAgente(handoff: HandoffCoordenacao): Promise<ResultadoDespachoAgente>;
}
