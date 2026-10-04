import { randomUUID } from "node:crypto";
import { TrabalhoCoordenado, HandoffCoordenacao } from "../domain/coordenacao.js";
import { RepositorioCoordenacao } from "../domain/repositorio-coordenacao.js";
import { RepositorioProjeto } from "../domain/repositorio-projeto.js";
import {
  MotorCoordenacaoTrabalho,
  ResultadoAvaliacaoElegibilidade,
} from "../domain/motor-coordenacao.js";
import { CondicaoOperacionalTrabalho } from "../domain/tipos-coordenacao.js";
import { InvarianteVioladaErro, RecursoNaoEncontradoErro } from "../domain/erros.js";
import { FilaTarefas } from "../infrastructure/adapters/fila-tarefas.js";

export interface DadosCadastroTrabalho {
  codigo: string;
  projetoId: string;
  titulo: string;
  objetivo: string;
  competenciaRequerida: string;
  atorRequerido: string;
  skillRequerida?: string | null | undefined;
  executorDesignado?: string | null | undefined;
  criterioTermino: string;
  dependencias?: string[] | undefined;
  condicaoOperacional?: CondicaoOperacionalTrabalho | undefined;
}

export interface ReferenciasContextoHandoff {
  projeto: string;
  necessidade?: string | undefined;
  modulo?: string | undefined;
  entregaDeValor?: string | undefined;
  documentosNormativos?: string[] | undefined;
}

export interface HandoffEmitido {
  handoffId: string;
  trabalhoId: string;
  codigoTrabalho: string;
  tokenCorrelacao: string;
  atorDestinatario: string;
  skillDestinataria: string | null;
  despachadoEm: Date;
  conteudo: Record<string, unknown>;
}

export interface DadosRetornoExecucao {
  sucesso: boolean;
  resultadoObservavel: string;
  pendenciasOuBloqueios?: string | null | undefined;
}

export interface ResultadoProcessamentoRetorno {
  trabalhoId: string;
  codigoTrabalho: string;
  condicaoOperacionalResultante: CondicaoOperacionalTrabalho;
  retornoId: string;
  sucesso: boolean;
  trabalhosPromovidos: string[];
}

export interface VisaoTrabalhosCoordenacao {
  projetoId: string;
  totalTrabalhos: number;
  preparados: TrabalhoCoordenado[];
  emExecucao: TrabalhoCoordenado[];
  bloqueados: TrabalhoCoordenado[];
  aguardandoDecisao: TrabalhoCoordenado[];
  encerrados: TrabalhoCoordenado[];
  proximoAvancoValido: TrabalhoCoordenado | null;
  avaliacao: ResultadoAvaliacaoElegibilidade;
}

export interface DetalheTrabalhoCoordenado {
  trabalho: TrabalhoCoordenado;
  dependenciasDetalhadas: {
    codigo: string;
    titulo: string;
    condicaoOperacional: CondicaoOperacionalTrabalho;
    satisfeita: boolean;
  }[];
  handoffAtivo: HandoffCoordenacao | null;
}

/**
 * Serviço de Aplicação para a Coordenação do Trabalho (M-003 / EV-003).
 * Orquestra casos de uso:
 * 1. cadastrarTrabalho
 * 2. avaliarElegibilidadeTrabalhos
 * 3. obterProximoAvancoValido
 * 4. despacharProximoAvanco
 * 5. registrarRetornoExecucao
 * 6. listarTrabalhosCoordenados
 * 7. obterDetalhesTrabalho
 * 8. sincronizarFilaReavaliacao (agendamento assíncrono para o worker)
 */
export class ServicoAplicacaoCoordenacao {
  private repositorioCoordenacao: RepositorioCoordenacao;
  private repositorioProjeto?: RepositorioProjeto | undefined;
  private filaTarefas?: FilaTarefas | undefined;

  constructor(
    repositorioCoordenacao: RepositorioCoordenacao,
    repositorioProjeto?: RepositorioProjeto | undefined,
    filaTarefas?: FilaTarefas | undefined
  ) {
    this.repositorioCoordenacao = repositorioCoordenacao;
    this.repositorioProjeto = repositorioProjeto;
    this.filaTarefas = filaTarefas;
  }

  /**
   * Cadastra um novo Trabalho Coordenado vinculado a um Projeto.
   */
  public async cadastrarTrabalho(dados: DadosCadastroTrabalho): Promise<TrabalhoCoordenado> {
    if (!dados.projetoId || dados.projetoId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do projeto é obrigatório para cadastrar um trabalho.");
    }
    if (!dados.codigo || dados.codigo.trim() === "") {
      throw new InvarianteVioladaErro("O código do trabalho é obrigatório.");
    }

    if (this.repositorioProjeto) {
      const proj = await this.repositorioProjeto.obterPorId(dados.projetoId);
      if (!proj) {
        throw new RecursoNaoEncontradoErro("Projeto", dados.projetoId);
      }
    }

    const existente = await this.repositorioCoordenacao.obterPorCodigo(dados.codigo);
    if (existente) {
      throw new InvarianteVioladaErro(`Já existe um trabalho coordenado com o código '${dados.codigo}'.`);
    }

    const trabalho = new TrabalhoCoordenado({
      id: randomUUID(),
      codigo: dados.codigo.trim(),
      projetoId: dados.projetoId.trim(),
      titulo: dados.titulo.trim(),
      objetivo: dados.objetivo.trim(),
      competenciaRequerida: dados.competenciaRequerida.trim(),
      atorRequerido: dados.atorRequerido.trim(),
      skillRequerida: dados.skillRequerida ? dados.skillRequerida.trim() : null,
      executorDesignado: dados.executorDesignado ? dados.executorDesignado.trim() : null,
      criterioTermino: dados.criterioTermino.trim(),
      dependencias: dados.dependencias ?? [],
      condicaoOperacional: dados.condicaoOperacional ?? CondicaoOperacionalTrabalho.POSSIVEL,
    });

    await this.repositorioCoordenacao.salvar(trabalho);

    // Se houver fila, agenda reavaliação de elegibilidade
    if (this.filaTarefas) {
      await this.filaTarefas.enfileirar("REAVALIAR_COORDENACAO", { projetoId: dados.projetoId });
    }

    return trabalho;
  }

  /**
   * Avalia a elegibilidade de todos os trabalhos de um projeto e promove trabalhos elegíveis para PREPARADO.
   */
  public async avaliarElegibilidadeTrabalhos(
    projetoId: string
  ): Promise<ResultadoAvaliacaoElegibilidade> {
    const trabalhos = await this.repositorioCoordenacao.listarPorProjetoId(projetoId);

    // Promover trabalhos elegíveis de POSSIVEL para PREPARADO
    const promovidos = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis(projetoId, trabalhos);
    for (const t of promovidos) {
      await this.repositorioCoordenacao.salvar(t);
    }

    return MotorCoordenacaoTrabalho.avaliarElegibilidade(projetoId, trabalhos);
  }

  /**
   * Obtém deterministicamente o próximo avanço válido de um projeto.
   */
  public async obterProximoAvancoValido(
    projetoId: string
  ): Promise<TrabalhoCoordenado | null> {
    const resultado = await this.avaliarElegibilidadeTrabalhos(projetoId);
    return resultado.proximoAvancoValido;
  }

  /**
   * Despacha o próximo avanço válido emitindo um Handoff estruturado com token único e contexto recuperável.
   * Transiciona a condição operacional para EM_EXECUCAO de forma idempotente.
   */
  public async despacharProximoAvanco(
    trabalhoId: string,
    referenciasContexto: ReferenciasContextoHandoff,
    executorDesignado?: string | null,
    tokenCorrelacaoFornecido?: string | null
  ): Promise<HandoffEmitido> {
    const trabalho = await this.repositorioCoordenacao.obterPorId(trabalhoId);
    if (!trabalho) {
      throw new RecursoNaoEncontradoErro("TrabalhoCoordenado", trabalhoId);
    }

    // Idempotência: Se já estiver EM_EXECUCAO e houver handoff ativo sem retorno, retorna o handoff emitido
    if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.EM_EXECUCAO) {
      const ultimoHandoff = trabalho.handoffs[trabalho.handoffs.length - 1];
      if (ultimoHandoff && !ultimoHandoff.retorno) {
        return {
          handoffId: ultimoHandoff.id,
          trabalhoId: trabalho.id,
          codigoTrabalho: trabalho.codigo,
          tokenCorrelacao: ultimoHandoff.tokenCorrelacao,
          atorDestinatario: ultimoHandoff.atorDestinatario,
          skillDestinataria: ultimoHandoff.skillDestinataria,
          despachadoEm: ultimoHandoff.despachadoEm,
          conteudo: ultimoHandoff.conteudoHandoff as unknown as Record<string, unknown>,
        };
      }
    }

    // Se estiver em POSSIVEL, tenta promover antes de despachar
    if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.POSSIVEL) {
      await this.avaliarElegibilidadeTrabalhos(trabalho.projetoId);
      // Recarrega o trabalho atualizado
      const atualizado = await this.repositorioCoordenacao.obterPorId(trabalhoId);
      if (!atualizado) throw new RecursoNaoEncontradoErro("TrabalhoCoordenado", trabalhoId);
      if (atualizado.condicaoOperacional !== CondicaoOperacionalTrabalho.PREPARADO) {
        throw new InvarianteVioladaErro(
          `Trabalho '${trabalho.codigo}' não pôde ser promovido a PREPARADO para despacho (condição atual: ${atualizado.condicaoOperacional}).`
        );
      }
    }

    const token =
      tokenCorrelacaoFornecido && tokenCorrelacaoFornecido.trim() !== ""
        ? tokenCorrelacaoFornecido.trim()
        : `hdof-${trabalho.codigo.toLowerCase()}-${Date.now()}`;

    const handoff = trabalho.despacharHandoff(token, referenciasContexto, executorDesignado);
    await this.repositorioCoordenacao.salvar(trabalho);

    return {
      handoffId: handoff.id,
      trabalhoId: trabalho.id,
      codigoTrabalho: trabalho.codigo,
      tokenCorrelacao: handoff.tokenCorrelacao,
      atorDestinatario: handoff.atorDestinatario,
      skillDestinataria: handoff.skillDestinataria,
      despachadoEm: handoff.despachadoEm,
      conteudo: handoff.conteudoHandoff as unknown as Record<string, unknown>,
    };
  }

  /**
   * Registra o retorno de uma execução via token de correlação.
   * Trata idempotência de retornos duplicados e reavalia dependências sucessoras.
   */
  public async registrarRetornoExecucao(
    tokenCorrelacao: string,
    dadosRetorno: DadosRetornoExecucao
  ): Promise<ResultadoProcessamentoRetorno> {
    if (!tokenCorrelacao || tokenCorrelacao.trim() === "") {
      throw new InvarianteVioladaErro("O token de correlação é obrigatório para registrar retorno.");
    }

    const par = await this.repositorioCoordenacao.obterHandoffPorToken(tokenCorrelacao.trim());
    if (!par) {
      throw new RecursoNaoEncontradoErro("Handoff com token", tokenCorrelacao);
    }

    const { handoff, trabalho } = par;

    // Idempotência: se já tiver retorno anexado, retorna o resultado pré-existente sem duplicar
    if (handoff.retorno) {
      return {
        trabalhoId: trabalho.id,
        codigoTrabalho: trabalho.codigo,
        condicaoOperacionalResultante: trabalho.condicaoOperacional,
        retornoId: handoff.retorno.id,
        sucesso: handoff.retorno.sucesso,
        trabalhosPromovidos: [],
      };
    }

    const retorno = trabalho.registrarRetorno(
      tokenCorrelacao.trim(),
      dadosRetorno.sucesso,
      dadosRetorno.resultadoObservavel,
      dadosRetorno.pendenciasOuBloqueios
    );

    await this.repositorioCoordenacao.salvar(trabalho);

    // Se a execução foi com sucesso, reavalia e promove os sucessores
    const codigosPromovidos: string[] = [];
    if (dadosRetorno.sucesso) {
      const todosProjeto = await this.repositorioCoordenacao.listarPorProjetoId(trabalho.projetoId);
      const promovidos = MotorCoordenacaoTrabalho.promoverTrabalhosElegiveis(trabalho.projetoId, todosProjeto);
      for (const p of promovidos) {
        await this.repositorioCoordenacao.salvar(p);
        codigosPromovidos.push(p.codigo);
      }
    }

    // Se houver fila, agenda reavaliação de contexto
    if (this.filaTarefas) {
      await this.filaTarefas.enfileirar("REAVALIAR_COORDENACAO", {
        projetoId: trabalho.projetoId,
        trabalhoId: trabalho.id,
        sucesso: dadosRetorno.sucesso,
      });
    }

    return {
      trabalhoId: trabalho.id,
      codigoTrabalho: trabalho.codigo,
      condicaoOperacionalResultante: trabalho.condicaoOperacional,
      retornoId: retorno.id,
      sucesso: retorno.sucesso,
      trabalhosPromovidos: codigosPromovidos,
    };
  }

  /**
   * Lista a visão integrada de coordenação dos trabalhos de um projeto.
   */
  public async listarTrabalhosCoordenados(
    projetoId: string
  ): Promise<VisaoTrabalhosCoordenacao> {
    const avaliacao = await this.avaliarElegibilidadeTrabalhos(projetoId);

    return {
      projetoId,
      totalTrabalhos: avaliacao.totalTrabalhos,
      preparados: avaliacao.trabalhosPreparados,
      emExecucao: avaliacao.trabalhosEmExecucao,
      bloqueados: avaliacao.trabalhosBloqueados,
      aguardandoDecisao: avaliacao.trabalhosAguardandoDecisao,
      encerrados: avaliacao.trabalhosEncerrados,
      proximoAvancoValido: avaliacao.proximoAvancoValido,
      avaliacao,
    };
  }

  /**
   * Obtém detalhes de um trabalho coordenado específico com status de cada dependência e handoff ativo.
   */
  public async obterDetalhesTrabalho(trabalhoId: string): Promise<DetalheTrabalhoCoordenado> {
    const trabalho = await this.repositorioCoordenacao.obterPorId(trabalhoId);
    if (!trabalho) {
      throw new RecursoNaoEncontradoErro("TrabalhoCoordenado", trabalhoId);
    }

    const dependenciasDetalhadas: {
      codigo: string;
      titulo: string;
      condicaoOperacional: CondicaoOperacionalTrabalho;
      satisfeita: boolean;
    }[] = [];

    for (const depCodigo of trabalho.dependencias) {
      const dep = await this.repositorioCoordenacao.obterPorCodigo(depCodigo);
      if (dep) {
        dependenciasDetalhadas.push({
          codigo: dep.codigo,
          titulo: dep.titulo,
          condicaoOperacional: dep.condicaoOperacional,
          satisfeita: dep.condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO,
        });
      } else {
        dependenciasDetalhadas.push({
          codigo: depCodigo,
          titulo: "Trabalho não cadastrado",
          condicaoOperacional: CondicaoOperacionalTrabalho.POSSIVEL,
          satisfeita: false,
        });
      }
    }

    const handoffAtivo =
      trabalho.handoffs.length > 0 ? trabalho.handoffs[trabalho.handoffs.length - 1] ?? null : null;

    return {
      trabalho,
      dependenciasDetalhadas,
      handoffAtivo,
    };
  }
}
