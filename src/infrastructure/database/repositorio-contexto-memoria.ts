import { RegistroProveniencia, VinculoCausal } from "../../domain/contexto.js";
import {
  RepositorioContexto,
  FiltrosListagemProveniencia,
} from "../../domain/repositorio-contexto.js";

/**
 * Implementação em memória de RepositorioContexto (útil para testes unitários isolados e fallback).
 */
export class RepositorioContextoMemoria implements RepositorioContexto {
  private registros: Map<string, RegistroProveniencia> = new Map();
  private vinculos: Map<string, VinculoCausal> = new Map();

  public async salvarRegistro(registro: RegistroProveniencia): Promise<void> {
    this.registros.set(registro.id, registro);
  }

  public async obterRegistroPorId(id: string): Promise<RegistroProveniencia | null> {
    const reg = this.registros.get(id);
    return reg ? new RegistroProveniencia(reg.paraDados()) : null;
  }

  public async obterRegistrosPorCodigo(codigoReferencia: string): Promise<RegistroProveniencia[]> {
    const cod = codigoReferencia.trim().toUpperCase();
    return Array.from(this.registros.values())
      .filter((r) => r.codigoReferencia.toUpperCase() === cod)
      .map((r) => new RegistroProveniencia(r.paraDados()));
  }

  public async listarRegistros(filtros?: FiltrosListagemProveniencia): Promise<RegistroProveniencia[]> {
    let lista = Array.from(this.registros.values());

    if (filtros) {
      if (filtros.entidadeTipo) {
        lista = lista.filter((r) => r.entidadeTipo === filtros.entidadeTipo);
      }
      if (filtros.entidadeId) {
        lista = lista.filter((r) => r.entidadeId === filtros.entidadeId);
      }
      if (filtros.codigoReferencia) {
        const cod = filtros.codigoReferencia.trim().toUpperCase();
        lista = lista.filter((r) => r.codigoReferencia.toUpperCase() === cod);
      }
      if (filtros.tipoRegistro) {
        lista = lista.filter((r) => r.tipoRegistro === filtros.tipoRegistro);
      }
      if (filtros.apenasVigentes !== undefined) {
        lista = lista.filter((r) => r.vigente === filtros.apenasVigentes);
      }
    }

    return lista.map((r) => new RegistroProveniencia(r.paraDados()));
  }

  public async salvarVinculo(vinculo: VinculoCausal): Promise<void> {
    // Unicidade de vínculo direcionado (origem, destino, tipo)
    for (const v of this.vinculos.values()) {
      if (
        v.origemRegistroId === vinculo.origemRegistroId &&
        v.destinoRegistroId === vinculo.destinoRegistroId &&
        v.tipoRelacao === vinculo.tipoRelacao
      ) {
        return; // Idempotente
      }
    }
    this.vinculos.set(vinculo.id, vinculo);
  }

  public async obterVinculoPorId(id: string): Promise<VinculoCausal | null> {
    const v = this.vinculos.get(id);
    return v ? new VinculoCausal(v.paraDados()) : null;
  }

  public async listarVinculosPorRegistro(registroId: string): Promise<VinculoCausal[]> {
    return Array.from(this.vinculos.values())
      .filter((v) => v.origemRegistroId === registroId || v.destinoRegistroId === registroId)
      .map((v) => new VinculoCausal(v.paraDados()));
  }

  public async listarTodosVinculos(): Promise<VinculoCausal[]> {
    return Array.from(this.vinculos.values()).map((v) => new VinculoCausal(v.paraDados()));
  }

  public async listarTodosRegistros(): Promise<RegistroProveniencia[]> {
    return Array.from(this.registros.values()).map((r) => new RegistroProveniencia(r.paraDados()));
  }
}
