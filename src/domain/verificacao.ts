import { randomUUID } from "node:crypto";
import { MetodoObservacao, ConclusaoVerificacao } from "./tipos-verificacao.js";
import {
  DadosCriacaoResultadoSoftware,
  DadosCriacaoCriterioVerificavel,
  DadosCriacaoEvidenciaVerificacao,
  DadosCriacaoLaudoVerificacao,
} from "./valores-verificacao.js";
import { InvarianteVioladaErro } from "./erros.js";

/**
 * Entidade de Domínio Puro: ResultadoSoftware
 * Representa um incremento ou produto de software disponibilizado para verificação técnica.
 */
export class ResultadoSoftware {
  readonly id: string;
  readonly codigoReferencia: string;
  readonly moduloOrigem: string;
  readonly entregaValorCodigo: string;
  readonly versaoArtefato: string;
  readonly descricao: string;
  readonly declaradoPor: string;
  readonly registradoEm: Date;

  constructor(dados: DadosCriacaoResultadoSoftware) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Resultado de Software é obrigatório.");
    }
    if (!dados.codigoReferencia || dados.codigoReferencia.trim() === "") {
      throw new InvarianteVioladaErro("O código de referência do Resultado de Software é obrigatório.");
    }
    if (!dados.moduloOrigem || dados.moduloOrigem.trim() === "") {
      throw new InvarianteVioladaErro("O módulo de origem do Resultado de Software é obrigatório.");
    }
    if (!dados.entregaValorCodigo || dados.entregaValorCodigo.trim() === "") {
      throw new InvarianteVioladaErro("A Entrega de Valor associada ao Resultado de Software é obrigatória.");
    }
    if (!dados.versaoArtefato || dados.versaoArtefato.trim() === "") {
      throw new InvarianteVioladaErro("A versão/revisão do artefato de software é obrigatória.");
    }
    if (!dados.descricao || dados.descricao.trim() === "") {
      throw new InvarianteVioladaErro("A descrição do Resultado de Software é obrigatória.");
    }
    if (!dados.declaradoPor || dados.declaradoPor.trim() === "") {
      throw new InvarianteVioladaErro("O Ator/agente declarador do Resultado de Software é obrigatório.");
    }

    this.id = dados.id;
    this.codigoReferencia = dados.codigoReferencia.trim();
    this.moduloOrigem = dados.moduloOrigem.trim();
    this.entregaValorCodigo = dados.entregaValorCodigo.trim();
    this.versaoArtefato = dados.versaoArtefato.trim();
    this.descricao = dados.descricao.trim();
    this.declaradoPor = dados.declaradoPor.trim();
    this.registradoEm = dados.registradoEm ?? new Date();
  }

  paraDados(): DadosCriacaoResultadoSoftware {
    return {
      id: this.id,
      codigoReferencia: this.codigoReferencia,
      moduloOrigem: this.moduloOrigem,
      entregaValorCodigo: this.entregaValorCodigo,
      versaoArtefato: this.versaoArtefato,
      descricao: this.descricao,
      declaradoPor: this.declaradoPor,
      registradoEm: this.registradoEm,
    };
  }

  static criar(
    dados: Omit<DadosCriacaoResultadoSoftware, "id" | "registradoEm"> & { id?: string }
  ): ResultadoSoftware {
    return new ResultadoSoftware({
      id: dados.id ?? randomUUID(),
      codigoReferencia: dados.codigoReferencia,
      moduloOrigem: dados.moduloOrigem,
      entregaValorCodigo: dados.entregaValorCodigo,
      versaoArtefato: dados.versaoArtefato,
      descricao: dados.descricao,
      declaradoPor: dados.declaradoPor,
      registradoEm: new Date(),
    });
  }
}

/**
 * Entidade de Domínio Puro: CriterioVerificavel
 * Modela uma condição de conformidade técnica objetiva derivada da origem normativa.
 */
export class CriterioVerificavel {
  readonly id: string;
  readonly codigo: string;
  readonly resultadoSoftwareId: string;
  readonly origemNormativa: string;
  readonly descricaoComportamento: string;
  readonly metodoObservacao: MetodoObservacao;
  readonly condicaoSatisfacao: string;
  readonly limitesOuTolerancias: string | null;
  readonly criadoEm: Date;

  constructor(dados: DadosCriacaoCriterioVerificavel) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Critério Verificável é obrigatório.");
    }
    if (!dados.codigo || dados.codigo.trim() === "") {
      throw new InvarianteVioladaErro("O código do Critério Verificável é obrigatório.");
    }
    if (!dados.resultadoSoftwareId || dados.resultadoSoftwareId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Resultado de Software (resultadoSoftwareId) é obrigatório.");
    }
    if (!dados.origemNormativa || dados.origemNormativa.trim() === "") {
      throw new InvarianteVioladaErro("A origem normativa do critério é obrigatória.");
    }
    if (!dados.descricaoComportamento || dados.descricaoComportamento.trim() === "") {
      throw new InvarianteVioladaErro("A descrição do comportamento esperado é obrigatória.");
    }
    if (!dados.metodoObservacao || !Object.values(MetodoObservacao).includes(dados.metodoObservacao)) {
      throw new InvarianteVioladaErro(`O método de observação '${dados.metodoObservacao}' é inválido.`);
    }
    if (!dados.condicaoSatisfacao || dados.condicaoSatisfacao.trim() === "") {
      throw new InvarianteVioladaErro("A condição de satisfação do critério é obrigatória.");
    }

    this.id = dados.id;
    this.codigo = dados.codigo.trim();
    this.resultadoSoftwareId = dados.resultadoSoftwareId.trim();
    this.origemNormativa = dados.origemNormativa.trim();
    this.descricaoComportamento = dados.descricaoComportamento.trim();
    this.metodoObservacao = dados.metodoObservacao;
    this.condicaoSatisfacao = dados.condicaoSatisfacao.trim();
    this.limitesOuTolerancias = dados.limitesOuTolerancias ? dados.limitesOuTolerancias.trim() : null;
    this.criadoEm = dados.criadoEm ?? new Date();
  }

  paraDados(): DadosCriacaoCriterioVerificavel {
    return {
      id: this.id,
      codigo: this.codigo,
      resultadoSoftwareId: this.resultadoSoftwareId,
      origemNormativa: this.origemNormativa,
      descricaoComportamento: this.descricaoComportamento,
      metodoObservacao: this.metodoObservacao,
      condicaoSatisfacao: this.condicaoSatisfacao,
      limitesOuTolerancias: this.limitesOuTolerancias,
      criadoEm: this.criadoEm,
    };
  }

  static criar(
    dados: Omit<DadosCriacaoCriterioVerificavel, "id" | "criadoEm"> & { id?: string }
  ): CriterioVerificavel {
    return new CriterioVerificavel({
      id: dados.id ?? randomUUID(),
      codigo: dados.codigo,
      resultadoSoftwareId: dados.resultadoSoftwareId,
      origemNormativa: dados.origemNormativa,
      descricaoComportamento: dados.descricaoComportamento,
      metodoObservacao: dados.metodoObservacao,
      condicaoSatisfacao: dados.condicaoSatisfacao,
      limitesOuTolerancias: dados.limitesOuTolerancias,
      criadoEm: new Date(),
    });
  }
}

/**
 * Entidade de Domínio Puro: EvidenciaVerificacao
 * Modela um fato observável ou telemetria técnica coletada a partir de execução contra um critério.
 */
export class EvidenciaVerificacao {
  readonly id: string;
  readonly criterioId: string;
  readonly procedimentoExecutado: string;
  readonly resultadoObservado: string;
  readonly dadosDetalhados: Readonly<Record<string, unknown>>;
  readonly sucesso: boolean;
  readonly coletadoPor: string;
  readonly coletadoEm: Date;

  constructor(dados: DadosCriacaoEvidenciaVerificacao) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador da Evidência de Verificação é obrigatório.");
    }
    if (!dados.criterioId || dados.criterioId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Critério Verificável (criterioId) é obrigatório.");
    }
    if (!dados.procedimentoExecutado || dados.procedimentoExecutado.trim() === "") {
      throw new InvarianteVioladaErro("O procedimento executado na coleta da evidência é obrigatório.");
    }
    if (!dados.resultadoObservado || dados.resultadoObservado.trim() === "") {
      throw new InvarianteVioladaErro("O resultado observado na evidência é obrigatório.");
    }
    if (typeof dados.sucesso !== "boolean") {
      throw new InvarianteVioladaErro("O indicador de sucesso booleano da evidência é obrigatório.");
    }
    if (!dados.coletadoPor || dados.coletadoPor.trim() === "") {
      throw new InvarianteVioladaErro("O responsável pela coleta da evidência é obrigatório.");
    }

    this.id = dados.id;
    this.criterioId = dados.criterioId.trim();
    this.procedimentoExecutado = dados.procedimentoExecutado.trim();
    this.resultadoObservado = dados.resultadoObservado.trim();
    this.dadosDetalhados = Object.freeze({ ...(dados.dadosDetalhados ?? {}) });
    this.sucesso = dados.sucesso;
    this.coletadoPor = dados.coletadoPor.trim();
    this.coletadoEm = dados.coletadoEm ?? new Date();
  }

  paraDados(): DadosCriacaoEvidenciaVerificacao {
    return {
      id: this.id,
      criterioId: this.criterioId,
      procedimentoExecutado: this.procedimentoExecutado,
      resultadoObservado: this.resultadoObservado,
      dadosDetalhados: { ...this.dadosDetalhados },
      sucesso: this.sucesso,
      coletadoPor: this.coletadoPor,
      coletadoEm: this.coletadoEm,
    };
  }

  static criar(
    dados: Omit<DadosCriacaoEvidenciaVerificacao, "id" | "coletadoEm"> & { id?: string }
  ): EvidenciaVerificacao {
    return new EvidenciaVerificacao({
      id: dados.id ?? randomUUID(),
      criterioId: dados.criterioId,
      procedimentoExecutado: dados.procedimentoExecutado,
      resultadoObservado: dados.resultadoObservado,
      dadosDetalhados: dados.dadosDetalhados,
      sucesso: dados.sucesso,
      coletadoPor: dados.coletadoPor,
      coletadoEm: new Date(),
    });
  }
}

/**
 * Entidade de Domínio Puro: LaudoVerificacao
 * Modela a interpretação técnica imutável e explicável que correlaciona um critério e suas evidências.
 */
export class LaudoVerificacao {
  readonly id: string;
  readonly resultadoSoftwareId: string;
  readonly criterioId: string;
  readonly conclusao: ConclusaoVerificacao;
  readonly fundamentacaoTecnica: string;
  readonly evidenciasUtilizadas: readonly string[];
  readonly divergenciasApontadas: string | null;
  readonly emitidoPor: string;
  readonly emitidoEm: Date;

  constructor(dados: DadosCriacaoLaudoVerificacao) {
    if (!dados.id || dados.id.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do Laudo de Verificação é obrigatório.");
    }
    if (!dados.resultadoSoftwareId || dados.resultadoSoftwareId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Resultado de Software (resultadoSoftwareId) é obrigatório.");
    }
    if (!dados.criterioId || dados.criterioId.trim() === "") {
      throw new InvarianteVioladaErro("O vínculo com o Critério Verificável (criterioId) é obrigatório.");
    }
    if (!dados.conclusao || !Object.values(ConclusaoVerificacao).includes(dados.conclusao)) {
      throw new InvarianteVioladaErro(`A conclusão técnica '${dados.conclusao}' é inválida.`);
    }
    if (!dados.fundamentacaoTecnica || dados.fundamentacaoTecnica.trim() === "") {
      throw new InvarianteVioladaErro("A fundamentação técnica do laudo é obrigatória.");
    }
    if (!dados.emitidoPor || dados.emitidoPor.trim() === "") {
      throw new InvarianteVioladaErro("O Ator/sistema emissor do laudo é obrigatório.");
    }

    this.id = dados.id;
    this.resultadoSoftwareId = dados.resultadoSoftwareId.trim();
    this.criterioId = dados.criterioId.trim();
    this.conclusao = dados.conclusao;
    this.fundamentacaoTecnica = dados.fundamentacaoTecnica.trim();
    this.evidenciasUtilizadas = Object.freeze([...(dados.evidenciasUtilizadas ?? [])]);
    this.divergenciasApontadas = dados.divergenciasApontadas ? dados.divergenciasApontadas.trim() : null;
    this.emitidoPor = dados.emitidoPor.trim();
    this.emitidoEm = dados.emitidoEm ?? new Date();
  }

  paraDados(): DadosCriacaoLaudoVerificacao {
    return {
      id: this.id,
      resultadoSoftwareId: this.resultadoSoftwareId,
      criterioId: this.criterioId,
      conclusao: this.conclusao,
      fundamentacaoTecnica: this.fundamentacaoTecnica,
      evidenciasUtilizadas: [...this.evidenciasUtilizadas],
      divergenciasApontadas: this.divergenciasApontadas,
      emitidoPor: this.emitidoPor,
      emitidoEm: this.emitidoEm,
    };
  }

  static criar(
    dados: Omit<DadosCriacaoLaudoVerificacao, "id" | "emitidoEm"> & { id?: string }
  ): LaudoVerificacao {
    return new LaudoVerificacao({
      id: dados.id ?? randomUUID(),
      resultadoSoftwareId: dados.resultadoSoftwareId,
      criterioId: dados.criterioId,
      conclusao: dados.conclusao,
      fundamentacaoTecnica: dados.fundamentacaoTecnica,
      evidenciasUtilizadas: dados.evidenciasUtilizadas,
      divergenciasApontadas: dados.divergenciasApontadas,
      emitidoPor: dados.emitidoPor,
      emitidoEm: new Date(),
    });
  }
}
