import { Necessidade } from "../../domain/necessidade.js";
import { CompromissoNecessidade } from "../../domain/valores.js";
import { RepositorioNecessidade } from "../../domain/repositorio-necessidade.js";

/**
 * Repositório em memória para a entidade Necessidade.
 * Permite testes rápidos e isolados bem como fallback seguro.
 */
export class RepositorioNecessidadeMemoria implements RepositorioNecessidade {
  private itens: Map<string, Necessidade> = new Map();

  public async salvar(necessidade: Necessidade): Promise<void> {
    this.itens.set(necessidade.id, necessidade);
  }

  public async obterPorId(id: string): Promise<Necessidade | null> {
    return this.itens.get(id) ?? null;
  }

  public async obterPorCodigo(codigo: string): Promise<Necessidade | null> {
    for (const item of this.itens.values()) {
      if (item.codigo === codigo) {
        return item;
      }
    }
    return null;
  }

  public async obterCompromisso(necessidadeId: string): Promise<CompromissoNecessidade | null> {
    const item = this.itens.get(necessidadeId);
    return item?.compromisso ?? null;
  }

  public async listarTodas(): Promise<Necessidade[]> {
    return Array.from(this.itens.values()).sort(
      (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()
    );
  }
}
