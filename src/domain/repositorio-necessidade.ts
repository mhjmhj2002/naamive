import { Necessidade } from "../domain/necessidade.js";
import { CompromissoNecessidade } from "../domain/valores.js";

/**
 * Interface do repositório de persistência da Necessidade.
 * Desacopla a camada de domínio puro das bibliotecas de persistência física (PostgreSQL).
 */
export interface RepositorioNecessidade {
  salvar(necessidade: Necessidade): Promise<void>;
  obterPorId(id: string): Promise<Necessidade | null>;
  obterPorCodigo(codigo: string): Promise<Necessidade | null>;
  obterCompromisso(necessidadeId: string): Promise<CompromissoNecessidade | null>;
  listarTodas(): Promise<Necessidade[]>;
}
