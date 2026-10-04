import { Projeto } from "../../domain/projeto.js";
import { RepositorioProjeto } from "../../domain/repositorio-projeto.js";

/**
 * Repositório em memória para a entidade Projeto.
 * Permite testes rápidos e isolados bem como fallback seguro.
 */
export class RepositorioProjetoMemoria implements RepositorioProjeto {
  private itens: Map<string, Projeto> = new Map();

  public async salvar(projeto: Projeto): Promise<void> {
    this.itens.set(projeto.id, projeto);
  }

  public async obterPorId(id: string): Promise<Projeto | null> {
    return this.itens.get(id) ?? null;
  }

  public async obterPorCodigo(codigo: string): Promise<Projeto | null> {
    for (const item of this.itens.values()) {
      if (item.codigo === codigo) {
        return item;
      }
    }
    return null;
  }

  public async obterPorNecessidadeId(necessidadeId: string): Promise<Projeto | null> {
    for (const item of this.itens.values()) {
      if (item.necessidadeId === necessidadeId) {
        return item;
      }
    }
    return null;
  }

  public async listarTodos(): Promise<Projeto[]> {
    return Array.from(this.itens.values()).sort(
      (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()
    );
  }
}
