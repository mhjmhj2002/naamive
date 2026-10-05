import {
  ResultadoSoftware,
  CriterioVerificavel,
  EvidenciaVerificacao,
  LaudoVerificacao,
} from "../../domain/verificacao.js";
import { RepositorioVerificacao } from "../../domain/repositorio-verificacao.js";

/**
 * Implementação em memória do RepositorioVerificacao para testes rápidos e isolados.
 */
export class RepositorioVerificacaoMemoria implements RepositorioVerificacao {
  private resultados: Map<string, ResultadoSoftware> = new Map();
  private criterios: Map<string, CriterioVerificavel> = new Map();
  private evidencias: Map<string, EvidenciaVerificacao> = new Map();
  private laudos: Map<string, LaudoVerificacao> = new Map();

  // 1. Resultados de Software
  public async salvarResultado(resultado: ResultadoSoftware): Promise<void> {
    this.resultados.set(resultado.id, resultado);
  }

  public async obterResultadoPorId(id: string): Promise<ResultadoSoftware | null> {
    return this.resultados.get(id) ?? null;
  }

  public async obterResultadoPorCodigo(codigoReferencia: string): Promise<ResultadoSoftware | null> {
    const cod = codigoReferencia.trim().toUpperCase();
    for (const res of this.resultados.values()) {
      if (res.codigoReferencia.toUpperCase() === cod) {
        return res;
      }
    }
    return null;
  }

  public async listarResultados(filtros?: {
    moduloOrigem?: string;
    entregaValorCodigo?: string;
  }): Promise<ResultadoSoftware[]> {
    let lista = Array.from(this.resultados.values());
    if (filtros?.moduloOrigem) {
      const mod = filtros.moduloOrigem.toUpperCase();
      lista = lista.filter((r) => r.moduloOrigem.toUpperCase() === mod);
    }
    if (filtros?.entregaValorCodigo) {
      const ev = filtros.entregaValorCodigo.toUpperCase();
      lista = lista.filter((r) => r.entregaValorCodigo.toUpperCase() === ev);
    }
    return lista.sort((a, b) => b.registradoEm.getTime() - a.registradoEm.getTime());
  }

  // 2. Critérios Verificáveis
  public async salvarCriterio(criterio: CriterioVerificavel): Promise<void> {
    if (!this.resultados.has(criterio.resultadoSoftwareId)) {
      throw new Error(
        `Não é possível salvar critério: Resultado de Software '${criterio.resultadoSoftwareId}' não existe.`
      );
    }
    this.criterios.set(criterio.id, criterio);
  }

  public async obterCriterioPorId(id: string): Promise<CriterioVerificavel | null> {
    return this.criterios.get(id) ?? null;
  }

  public async obterCriterioPorCodigo(codigo: string): Promise<CriterioVerificavel | null> {
    const cod = codigo.trim().toUpperCase();
    for (const crit of this.criterios.values()) {
      if (crit.codigo.toUpperCase() === cod) {
        return crit;
      }
    }
    return null;
  }

  public async listarCriteriosPorResultado(
    resultadoSoftwareId: string
  ): Promise<CriterioVerificavel[]> {
    return Array.from(this.criterios.values())
      .filter((c) => c.resultadoSoftwareId === resultadoSoftwareId)
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  public async listarTodosCriterios(): Promise<CriterioVerificavel[]> {
    return Array.from(this.criterios.values()).sort(
      (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime()
    );
  }

  // 3. Evidências de Verificação
  public async salvarEvidencia(evidencia: EvidenciaVerificacao): Promise<void> {
    if (!this.criterios.has(evidencia.criterioId)) {
      throw new Error(
        `Não é possível salvar evidência: Critério Verificável '${evidencia.criterioId}' não existe.`
      );
    }
    this.evidencias.set(evidencia.id, evidencia);
  }

  public async obterEvidenciaPorId(id: string): Promise<EvidenciaVerificacao | null> {
    return this.evidencias.get(id) ?? null;
  }

  public async listarEvidenciasPorCriterio(criterioId: string): Promise<EvidenciaVerificacao[]> {
    return Array.from(this.evidencias.values())
      .filter((e) => e.criterioId === criterioId)
      .sort((a, b) => a.coletadoEm.getTime() - b.coletadoEm.getTime());
  }

  public async listarEvidenciasPorResultado(
    resultadoSoftwareId: string
  ): Promise<EvidenciaVerificacao[]> {
    const criteriosIds = new Set(
      Array.from(this.criterios.values())
        .filter((c) => c.resultadoSoftwareId === resultadoSoftwareId)
        .map((c) => c.id)
    );

    return Array.from(this.evidencias.values())
      .filter((e) => criteriosIds.has(e.criterioId))
      .sort((a, b) => a.coletadoEm.getTime() - b.coletadoEm.getTime());
  }

  // 4. Laudos Técnicos de Verificação
  public async salvarLaudo(laudo: LaudoVerificacao): Promise<void> {
    if (!this.resultados.has(laudo.resultadoSoftwareId)) {
      throw new Error(
        `Não é possível salvar laudo: Resultado de Software '${laudo.resultadoSoftwareId}' não existe.`
      );
    }
    if (!this.criterios.has(laudo.criterioId)) {
      throw new Error(
        `Não é possível salvar laudo: Critério Verificável '${laudo.criterioId}' não existe.`
      );
    }
    const chave = `${laudo.resultadoSoftwareId}#${laudo.criterioId}`;
    this.laudos.set(chave, laudo);
  }

  public async obterLaudoPorId(id: string): Promise<LaudoVerificacao | null> {
    for (const l of this.laudos.values()) {
      if (l.id === id) return l;
    }
    return null;
  }

  public async obterLaudoPorResultadoECriterio(
    resultadoSoftwareId: string,
    criterioId: string
  ): Promise<LaudoVerificacao | null> {
    const chave = `${resultadoSoftwareId}#${criterioId}`;
    return this.laudos.get(chave) ?? null;
  }

  public async listarLaudosPorResultado(
    resultadoSoftwareId: string
  ): Promise<LaudoVerificacao[]> {
    return Array.from(this.laudos.values())
      .filter((l) => l.resultadoSoftwareId === resultadoSoftwareId)
      .sort((a, b) => a.emitidoEm.getTime() - b.emitidoEm.getTime());
  }

  public async listarTodosLaudos(): Promise<LaudoVerificacao[]> {
    return Array.from(this.laudos.values()).sort(
      (a, b) => a.emitidoEm.getTime() - b.emitidoEm.getTime()
    );
  }
}
