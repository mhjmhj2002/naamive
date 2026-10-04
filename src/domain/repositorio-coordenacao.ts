import { TrabalhoCoordenado, HandoffCoordenacao } from "./coordenacao.js";
import { CondicaoOperacionalTrabalho } from "./tipos-coordenacao.js";

/**
 * Contrato de repositório puro para persistência e recuperação da entidade TrabalhoCoordenado
 * e seus agregados (Handoffs e Retornos).
 */
export interface RepositorioCoordenacao {
  salvar(trabalho: TrabalhoCoordenado): Promise<void>;
  obterPorId(id: string): Promise<TrabalhoCoordenado | null>;
  obterPorCodigo(codigo: string): Promise<TrabalhoCoordenado | null>;
  listarPorProjetoId(projetoId: string): Promise<TrabalhoCoordenado[]>;
  listarPorCondicao(condicao: CondicaoOperacionalTrabalho): Promise<TrabalhoCoordenado[]>;
  obterHandoffPorToken(tokenCorrelacao: string): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null>;
  obterHandoffPorId(handoffId: string): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null>;
  listarTodos(): Promise<TrabalhoCoordenado[]>;
}
