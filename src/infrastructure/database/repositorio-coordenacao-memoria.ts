import { TrabalhoCoordenado, HandoffCoordenacao } from "../../domain/coordenacao.js";
import { RepositorioCoordenacao } from "../../domain/repositorio-coordenacao.js";
import { CondicaoOperacionalTrabalho } from "../../domain/tipos-coordenacao.js";

/**
 * Adaptador de repositório em memória para a Coordenação do Trabalho.
 * Utilizado para execução rápida de testes unitários ou ambientes sem banco relacional ativo.
 */
export class RepositorioCoordenacaoMemoria implements RepositorioCoordenacao {
  private trabalhos: Map<string, TrabalhoCoordenado> = new Map();

  public async salvar(trabalho: TrabalhoCoordenado): Promise<void> {
    this.trabalhos.set(trabalho.id, trabalho);
  }

  public async obterPorId(id: string): Promise<TrabalhoCoordenado | null> {
    const t = this.trabalhos.get(id);
    return t ? t : null;
  }

  public async obterPorCodigo(codigo: string): Promise<TrabalhoCoordenado | null> {
    for (const t of this.trabalhos.values()) {
      if (t.codigo === codigo) return t;
    }
    return null;
  }

  public async listarPorProjetoId(projetoId: string): Promise<TrabalhoCoordenado[]> {
    const lista: TrabalhoCoordenado[] = [];
    for (const t of this.trabalhos.values()) {
      if (t.projetoId === projetoId) lista.push(t);
    }
    return lista;
  }

  public async listarPorCondicao(condicao: CondicaoOperacionalTrabalho): Promise<TrabalhoCoordenado[]> {
    const lista: TrabalhoCoordenado[] = [];
    for (const t of this.trabalhos.values()) {
      if (t.condicaoOperacional === condicao) lista.push(t);
    }
    return lista;
  }

  public async obterHandoffPorToken(
    tokenCorrelacao: string
  ): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null> {
    for (const t of this.trabalhos.values()) {
      const handoff = t.handoffs.find((h) => h.tokenCorrelacao === tokenCorrelacao);
      if (handoff) {
        return { handoff, trabalho: t };
      }
    }
    return null;
  }

  public async obterHandoffPorId(
    handoffId: string
  ): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null> {
    for (const t of this.trabalhos.values()) {
      const handoff = t.handoffs.find((h) => h.id === handoffId);
      if (handoff) {
        return { handoff, trabalho: t };
      }
    }
    return null;
  }

  public async listarTodos(): Promise<TrabalhoCoordenado[]> {
    return Array.from(this.trabalhos.values());
  }

  public limpar(): void {
    this.trabalhos.clear();
  }
}
