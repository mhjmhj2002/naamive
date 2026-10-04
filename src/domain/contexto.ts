import { randomUUID } from "node:crypto";
import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
} from "./tipos-contexto.js";
import {
  DadosCriacaoRegistroProveniencia,
  DadosCriacaoVinculoCausal,
} from "./valores-contexto.js";
import { InvarianteVioladaErro } from "./erros.js";

/**
 * Entidade de Domínio Puro: RegistroProveniencia
 * Representa um registro imutável de proveniência, decisão, evidência ou transição na jornada.
 */
export class RegistroProveniencia {
  readonly id: string;
  readonly entidadeTipo: TipoEntidadeContexto;
  readonly entidadeId: string;
  readonly codigoReferencia: string;
  readonly tipoRegistro: TipoRegistroProveniencia;
  readonly autorResponsavel: string;
  readonly classificacaoEpistemica: ClassificacaoEpistemica;
  readonly dadosContexto: Readonly<Record<string, unknown>>;
  private _vigente: boolean;
  readonly registradoEm: Date;

  constructor(dados: DadosCriacaoRegistroProveniencia) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Registro de Proveniência é obrigatório.");
    }
    if (!dados.entidadeTipo || !Object.values(TipoEntidadeContexto).includes(dados.entidadeTipo)) {
      throw new InvarianteVioladaErro(`O tipo de entidade '${dados.entidadeTipo}' é inválido.`);
    }
    if (!dados.entidadeId || dados.entidadeId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador da entidade de origem (entidadeId) é obrigatório.");
    }
    if (!dados.codigoReferencia || dados.codigoReferencia.trim() === "") {
      throw new InvarianteVioladaErro("O código humano de referência (codigoReferencia) é obrigatório.");
    }
    if (!dados.tipoRegistro || !Object.values(TipoRegistroProveniencia).includes(dados.tipoRegistro)) {
      throw new InvarianteVioladaErro(`O tipo de registro '${dados.tipoRegistro}' é inválido.`);
    }
    if (!dados.autorResponsavel || dados.autorResponsavel.trim() === "") {
      throw new InvarianteVioladaErro("O autor/ator responsável pelo registro é obrigatório.");
    }
    if (
      !dados.classificacaoEpistemica ||
      !Object.values(ClassificacaoEpistemica).includes(dados.classificacaoEpistemica)
    ) {
      throw new InvarianteVioladaErro(
        `A classificação epistêmica '${dados.classificacaoEpistemica}' é inválida.`
      );
    }

    this.id = dados.id;
    this.entidadeTipo = dados.entidadeTipo;
    this.entidadeId = dados.entidadeId.trim();
    this.codigoReferencia = dados.codigoReferencia.trim();
    this.tipoRegistro = dados.tipoRegistro;
    this.autorResponsavel = dados.autorResponsavel.trim();
    this.classificacaoEpistemica = dados.classificacaoEpistemica;
    this.dadosContexto = Object.freeze({ ...(dados.dadosContexto ?? {}) });
    this._vigente = dados.vigente !== undefined ? dados.vigente : true;
    this.registradoEm = dados.registradoEm ?? new Date();
  }

  get vigente(): boolean {
    return this._vigente;
  }

  /**
   * Supera o registro historicamente.
   * Não altera a imutabilidade do registro original, apenas marca sua condição histórica de vigência.
   */
  marcarComoSuperado(): void {
    this._vigente = false;
  }

  /**
   * Converte a entidade para representação imutável de dados.
   */
  paraDados(): DadosCriacaoRegistroProveniencia {
    return {
      id: this.id,
      entidadeTipo: this.entidadeTipo,
      entidadeId: this.entidadeId,
      codigoReferencia: this.codigoReferencia,
      tipoRegistro: this.tipoRegistro,
      autorResponsavel: this.autorResponsavel,
      classificacaoEpistemica: this.classificacaoEpistemica,
      dadosContexto: { ...this.dadosContexto },
      vigente: this._vigente,
      registradoEm: this.registradoEm,
    };
  }

  /**
   * Criação fábrica estática de um novo registro com validação e UUID v4.
   */
  static criar(
    dados: Omit<DadosCriacaoRegistroProveniencia, "id" | "registradoEm"> & { id?: string }
  ): RegistroProveniencia {
    return new RegistroProveniencia({
      id: dados.id ?? randomUUID(),
      entidadeTipo: dados.entidadeTipo,
      entidadeId: dados.entidadeId,
      codigoReferencia: dados.codigoReferencia,
      tipoRegistro: dados.tipoRegistro,
      autorResponsavel: dados.autorResponsavel,
      classificacaoEpistemica: dados.classificacaoEpistemica,
      dadosContexto: dados.dadosContexto,
      vigente: dados.vigente ?? true,
      registradoEm: new Date(),
    });
  }
}

/**
 * Entidade de Domínio Puro: VinculoCausal
 * Representa uma aresta direcionada no grafo de rastreabilidade causal do NAAMIVE.
 */
export class VinculoCausal {
  readonly id: string;
  readonly origemRegistroId: string;
  readonly destinoRegistroId: string;
  readonly tipoRelacao: TipoRelacaoCausal;
  readonly justificativa: string | null;
  readonly criadoEm: Date;

  constructor(dados: DadosCriacaoVinculoCausal) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Vínculo Causal é obrigatório.");
    }
    if (!dados.origemRegistroId || dados.origemRegistroId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do registro de origem é obrigatório no vínculo causal.");
    }
    if (!dados.destinoRegistroId || dados.destinoRegistroId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do registro de destino é obrigatório no vínculo causal.");
    }
    if (dados.origemRegistroId.trim() === dados.destinoRegistroId.trim()) {
      throw new InvarianteVioladaErro("Um registro não pode estabelecer vínculo causal reflexivo com ele mesmo.");
    }
    if (!dados.tipoRelacao || !Object.values(TipoRelacaoCausal).includes(dados.tipoRelacao)) {
      throw new InvarianteVioladaErro(`O tipo de relação causal '${dados.tipoRelacao}' é inválido.`);
    }

    this.id = dados.id;
    this.origemRegistroId = dados.origemRegistroId.trim();
    this.destinoRegistroId = dados.destinoRegistroId.trim();
    this.tipoRelacao = dados.tipoRelacao;
    this.justificativa = dados.justificativa ? dados.justificativa.trim() : null;
    this.criadoEm = dados.criadoEm ?? new Date();
  }

  /**
   * Converte a entidade para dados de transferência.
   */
  paraDados(): DadosCriacaoVinculoCausal {
    return {
      id: this.id,
      origemRegistroId: this.origemRegistroId,
      destinoRegistroId: this.destinoRegistroId,
      tipoRelacao: this.tipoRelacao,
      justificativa: this.justificativa,
      criadoEm: this.criadoEm,
    };
  }

  /**
   * Criação fábrica estática de um novo vínculo causal.
   */
  static criar(
    origemRegistroId: string,
    destinoRegistroId: string,
    tipoRelacao: TipoRelacaoCausal,
    justificativa?: string | null,
    id?: string
  ): VinculoCausal {
    return new VinculoCausal({
      id: id ?? randomUUID(),
      origemRegistroId,
      destinoRegistroId,
      tipoRelacao,
      justificativa,
      criadoEm: new Date(),
    });
  }
}
