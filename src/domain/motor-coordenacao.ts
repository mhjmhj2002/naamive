import { TrabalhoCoordenado } from "./coordenacao.js";
import { CondicaoOperacionalTrabalho } from "./tipos-coordenacao.js";
import { InvarianteVioladaErro } from "./erros.js";

export interface DiagnosticoElegibilidadeTrabalho {
  trabalho: TrabalhoCoordenado;
  elegivel: boolean;
  dependenciasSatisfeitas: boolean;
  dependenciasPendentes: string[];
  motivoNaoElegivel?: string | undefined;
}

export interface ResultadoAvaliacaoElegibilidade {
  projetoId: string;
  totalTrabalhos: number;
  trabalhosPreparados: TrabalhoCoordenado[];
  trabalhosEmExecucao: TrabalhoCoordenado[];
  trabalhosBloqueados: TrabalhoCoordenado[];
  trabalhosAguardandoDecisao: TrabalhoCoordenado[];
  trabalhosEncerrados: TrabalhoCoordenado[];
  proximoAvancoValido: TrabalhoCoordenado | null;
  diagnosticos: DiagnosticoElegibilidadeTrabalho[];
}

/**
 * Serviço de Domínio Puro: MotorCoordenacaoTrabalho
 * Avalia o grafo de dependências entre trabalhos de um projeto, diagnostica elegibilidade
 * e identifica deterministicamente o próximo avanço válido.
 * 
 * Regras do Motor:
 * 1. Um trabalho é elegível para avanço quando todas as suas dependências declaradas estão ENCERRADO.
 * 2. Trabalhos com bloqueios ativos ou aguardando decisão humana soberana não são elegíveis.
 * 3. Se um trabalho elegível estiver em POSSIVEL, o motor avalia se satisfaz o invariante de especialização.
 * 4. O próximo avanço válido é o primeiro trabalho que esteja PREPARADO (ou elegível para ser preparado)
 *    obedecendo à ordem causal e sem execuções concorrentes inválidas.
 */
export class MotorCoordenacaoTrabalho {
  /**
   * Avalia a elegibilidade de todos os trabalhos de um projeto.
   */
  static avaliarElegibilidade(
    projetoId: string,
    trabalhos: TrabalhoCoordenado[]
  ): ResultadoAvaliacaoElegibilidade {
    if (!projetoId || projetoId.trim() === "") {
      throw new InvarianteVioladaErro("O identificador do projeto é obrigatório para avaliação de elegibilidade.");
    }

    // Mapa de código de trabalho -> TrabalhoCoordenado
    const mapaPorCodigo = new Map<string, TrabalhoCoordenado>();
    for (const t of trabalhos) {
      if (t.projetoId !== projetoId) {
        throw new InvarianteVioladaErro(
          `Trabalho '${t.codigo}' pertence ao projeto '${t.projetoId}', mas a avaliação foi solicitada para '${projetoId}'.`
        );
      }
      mapaPorCodigo.set(t.codigo, t);
    }

    const codigosEncerrados = new Set<string>();
    for (const t of trabalhos) {
      if (t.condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO) {
        codigosEncerrados.add(t.codigo);
      }
    }

    const diagnosticos: DiagnosticoElegibilidadeTrabalho[] = [];
    const preparados: TrabalhoCoordenado[] = [];
    const emExecucao: TrabalhoCoordenado[] = [];
    const bloqueados: TrabalhoCoordenado[] = [];
    const aguardandoDecisao: TrabalhoCoordenado[] = [];
    const encerrados: TrabalhoCoordenado[] = [];

    for (const trabalho of trabalhos) {
      switch (trabalho.condicaoOperacional) {
        case CondicaoOperacionalTrabalho.PREPARADO:
          preparados.push(trabalho);
          break;
        case CondicaoOperacionalTrabalho.EM_EXECUCAO:
          emExecucao.push(trabalho);
          break;
        case CondicaoOperacionalTrabalho.BLOQUEADO:
          bloqueados.push(trabalho);
          break;
        case CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA:
          aguardandoDecisao.push(trabalho);
          break;
        case CondicaoOperacionalTrabalho.ENCERRADO:
          encerrados.push(trabalho);
          break;
      }

      // Verificar dependências declaradas
      const dependenciasPendentes: string[] = [];
      for (const depCodigo of trabalho.dependencias) {
        if (!codigosEncerrados.has(depCodigo)) {
          dependenciasPendentes.push(depCodigo);
        }
      }

      const dependenciasSatisfeitas = dependenciasPendentes.length === 0;
      let elegivel = false;
      let motivoNaoElegivel: string | undefined;

      if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.ENCERRADO) {
        elegivel = false;
        motivoNaoElegivel = "Trabalho já ENCERRADO.";
      } else if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.EM_EXECUCAO) {
        elegivel = false;
        motivoNaoElegivel = "Trabalho já EM_EXECUCAO.";
      } else if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.BLOQUEADO) {
        elegivel = false;
        motivoNaoElegivel = `Trabalho BLOQUEADO: ${trabalho.motivoBloqueio ?? "motivo não especificado"}`;
      } else if (trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.AGUARDANDO_DECISAO_HUMANA) {
        elegivel = false;
        motivoNaoElegivel = `Aguardando Decisão Humana do Owner: ${trabalho.motivoBloqueio ?? "pendência não especificada"}`;
      } else if (!dependenciasSatisfeitas) {
        elegivel = false;
        motivoNaoElegivel = `Dependências pendentes não satisfeitas: ${dependenciasPendentes.join(", ")}`;
      } else {
        // Dependências satisfeitas e não bloqueado
        try {
          trabalho.validarInvarianteEspecializacao();
          elegivel = true;
        } catch (erro: any) {
          elegivel = false;
          motivoNaoElegivel = `Invariante de especialização não atendido: ${erro.message}`;
        }
      }

      diagnosticos.push({
        trabalho,
        elegivel,
        dependenciasSatisfeitas,
        dependenciasPendentes,
        motivoNaoElegivel,
      });
    }

    // Selecionar o próximo avanço válido
    // Prioridade 1: O primeiro que já está em PREPARADO
    // Prioridade 2: O primeiro que é elegível para ser preparado
    let proximoAvancoValido: TrabalhoCoordenado | null = null;
    if (preparados.length > 0) {
      proximoAvancoValido = preparados[0] ?? null;
    } else {
      const candidato = diagnosticos.find((d) => d.elegivel);
      if (candidato) {
        proximoAvancoValido = candidato.trabalho;
      }
    }

    return {
      projetoId,
      totalTrabalhos: trabalhos.length,
      trabalhosPreparados: preparados,
      trabalhosEmExecucao: emExecucao,
      trabalhosBloqueados: bloqueados,
      trabalhosAguardandoDecisao: aguardandoDecisao,
      trabalhosEncerrados: encerrados,
      proximoAvancoValido,
      diagnosticos,
    };
  }

  /**
   * Promove automaticamente os trabalhos elegíveis de POSSIVEL para PREPARADO
   * quando todas as suas dependências tiverem sido satisfeitas.
   * Retorna os trabalhos que foram promovidos.
   */
  static promoverTrabalhosElegiveis(
    projetoId: string,
    trabalhos: TrabalhoCoordenado[]
  ): TrabalhoCoordenado[] {
    const resultado = MotorCoordenacaoTrabalho.avaliarElegibilidade(projetoId, trabalhos);
    const promovidos: TrabalhoCoordenado[] = [];

    for (const diag of resultado.diagnosticos) {
      if (
        diag.elegivel &&
        diag.trabalho.condicaoOperacional === CondicaoOperacionalTrabalho.POSSIVEL
      ) {
        diag.trabalho.marcarComoPreparado();
        promovidos.push(diag.trabalho);
      }
    }

    return promovidos;
  }
}
