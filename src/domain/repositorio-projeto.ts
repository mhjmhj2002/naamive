import { Projeto } from "./projeto.js";

/**
 * Contrato de repositório puro para persistência e recuperação da entidade Projeto.
 */
export interface RepositorioProjeto {
  salvar(projeto: Projeto): Promise<void>;
  obterPorId(id: string): Promise<Projeto | null>;
  obterPorCodigo(codigo: string): Promise<Projeto | null>;
  obterPorNecessidadeId(necessidadeId: string): Promise<Projeto | null>;
  listarTodos(): Promise<Projeto[]>;
}
