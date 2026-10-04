import { TrabalhoCoordenado, HandoffCoordenacao, RetornoCoordenacao } from "../../domain/coordenacao.js";
import { RepositorioCoordenacao } from "../../domain/repositorio-coordenacao.js";
import { GerenciadorConexao } from "./conexao.js";
import { CondicaoOperacionalTrabalho } from "../../domain/tipos-coordenacao.js";
import { ConteudoHandoff, RegistroHistoricoCoordenacao } from "../../domain/valores-coordenacao.js";

/**
 * Adaptador de repositório concreto para a Coordenação do Trabalho em PostgreSQL.
 * Implementa a persistência relacional transacional para trabalhos_coordenados,
 * handoffs_coordenacao e retornos_coordenacao, garantindo integridade referencial
 * com projetos e atomicidade de transições de estado.
 */
export class RepositorioCoordenacaoPostgres implements RepositorioCoordenacao {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  public async salvar(trabalho: TrabalhoCoordenado): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // 1. Upsert da entidade raiz trabalhos_coordenados
      const sqlTrabalho = `
        INSERT INTO trabalhos_coordenados (
          id, codigo, projeto_id, titulo, objetivo, condicao_operacional,
          competencia_requerida, ator_requerido, skill_requerida, executor_designado,
          criterio_termino, dependencias, motivo_bloqueio, atualizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          objetivo = EXCLUDED.objetivo,
          condicao_operacional = EXCLUDED.condicao_operacional,
          competencia_requerida = EXCLUDED.competencia_requerida,
          ator_requerido = EXCLUDED.ator_requerido,
          skill_requerida = EXCLUDED.skill_requerida,
          executor_designado = EXCLUDED.executor_designado,
          criterio_termino = EXCLUDED.criterio_termino,
          dependencias = EXCLUDED.dependencias,
          motivo_bloqueio = EXCLUDED.motivo_bloqueio,
          atualizado_em = now();
      `.trim();

      await cliente.query(sqlTrabalho, [
        trabalho.id,
        trabalho.codigo,
        trabalho.projetoId,
        trabalho.titulo,
        trabalho.objetivo,
        trabalho.condicaoOperacional,
        trabalho.competenciaRequerida,
        trabalho.atorRequerido,
        trabalho.skillRequerida,
        trabalho.executorDesignado,
        trabalho.criterioTermino,
        JSON.stringify(trabalho.dependencias),
        trabalho.motivoBloqueio,
      ]);

      // 2. Persistência de Handoffs e seus Retornos
      for (const handoff of trabalho.handoffs) {
        const sqlHandoff = `
          INSERT INTO handoffs_coordenacao (
            id, trabalho_id, token_correlacao, ator_destinatario, skill_destinataria,
            conteudo_handoff, despachado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING;
        `.trim();

        await cliente.query(sqlHandoff, [
          handoff.id,
          trabalho.id,
          handoff.tokenCorrelacao,
          handoff.atorDestinatario,
          handoff.skillDestinataria,
          JSON.stringify(handoff.conteudoHandoff),
          handoff.despachadoEm,
        ]);

        if (handoff.retorno) {
          const ret = handoff.retorno;
          const sqlRetorno = `
            INSERT INTO retornos_coordenacao (
              id, handoff_id, sucesso, resultado_observavel, pendencias_ou_bloqueios, recebido_em
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING;
          `.trim();

          await cliente.query(sqlRetorno, [
            ret.id,
            handoff.id,
            ret.sucesso,
            ret.resultadoObservavel,
            ret.pendenciasOuBloqueios,
            ret.recebidoEm,
          ]);
        }
      }
    });
  }

  public async obterPorId(id: string): Promise<TrabalhoCoordenado | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM trabalhos_coordenados WHERE id = $1",
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarTrabalho(res.rows[0]);
  }

  public async obterPorCodigo(codigo: string): Promise<TrabalhoCoordenado | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM trabalhos_coordenados WHERE codigo = $1",
      [codigo]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarTrabalho(res.rows[0]);
  }

  public async listarPorProjetoId(projetoId: string): Promise<TrabalhoCoordenado[]> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM trabalhos_coordenados WHERE projeto_id = $1 ORDER BY criado_em ASC",
      [projetoId]
    );
    const lista: TrabalhoCoordenado[] = [];
    for (const row of res.rows) {
      lista.push(await this.hidratarTrabalho(row));
    }
    return lista;
  }

  public async listarPorCondicao(condicao: CondicaoOperacionalTrabalho): Promise<TrabalhoCoordenado[]> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM trabalhos_coordenados WHERE condicao_operacional = $1 ORDER BY criado_em ASC",
      [condicao]
    );
    const lista: TrabalhoCoordenado[] = [];
    for (const row of res.rows) {
      lista.push(await this.hidratarTrabalho(row));
    }
    return lista;
  }

  public async obterHandoffPorToken(
    tokenCorrelacao: string
  ): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT trabalho_id FROM handoffs_coordenacao WHERE token_correlacao = $1",
      [tokenCorrelacao]
    );
    if (res.rows.length === 0) return null;

    const trabalhoId = res.rows[0].trabalho_id;
    const trabalho = await this.obterPorId(trabalhoId);
    if (!trabalho) return null;

    const handoff = trabalho.handoffs.find((h) => h.tokenCorrelacao === tokenCorrelacao);
    if (!handoff) return null;

    return { handoff, trabalho };
  }

  public async obterHandoffPorId(
    handoffId: string
  ): Promise<{ handoff: HandoffCoordenacao; trabalho: TrabalhoCoordenado } | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT trabalho_id FROM handoffs_coordenacao WHERE id = $1",
      [handoffId]
    );
    if (res.rows.length === 0) return null;

    const trabalhoId = res.rows[0].trabalho_id;
    const trabalho = await this.obterPorId(trabalhoId);
    if (!trabalho) return null;

    const handoff = trabalho.handoffs.find((h) => h.id === handoffId);
    if (!handoff) return null;

    return { handoff, trabalho };
  }

  public async listarTodos(): Promise<TrabalhoCoordenado[]> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM trabalhos_coordenados ORDER BY criado_em ASC"
    );
    const lista: TrabalhoCoordenado[] = [];
    for (const row of res.rows) {
      lista.push(await this.hidratarTrabalho(row));
    }
    return lista;
  }

  private async hidratarTrabalho(row: any): Promise<TrabalhoCoordenado> {
    const trabalhoId = row.id;

    // Buscar handoffs do trabalho
    const resHandoffs = await this.conexao.executarConsulta(
      "SELECT * FROM handoffs_coordenacao WHERE trabalho_id = $1 ORDER BY despachado_em ASC",
      [trabalhoId]
    );

    const handoffs: HandoffCoordenacao[] = [];
    for (const rowH of resHandoffs.rows) {
      const conteudoHandoff: ConteudoHandoff =
        typeof rowH.conteudo_handoff === "string"
          ? JSON.parse(rowH.conteudo_handoff)
          : rowH.conteudo_handoff;

      const handoff = new HandoffCoordenacao({
        id: rowH.id,
        trabalhoId: rowH.trabalho_id,
        tokenCorrelacao: rowH.token_correlacao,
        atorDestinatario: rowH.ator_destinatario,
        skillDestinataria: rowH.skill_destinataria ?? null,
        conteudoHandoff,
        despachadoEm: new Date(rowH.despachado_em),
      });

      // Buscar retorno do handoff
      const resRet = await this.conexao.executarConsulta(
        "SELECT * FROM retornos_coordenacao WHERE handoff_id = $1",
        [rowH.id]
      );
      if (resRet.rows.length > 0) {
        const rowR = resRet.rows[0];
        const retorno = new RetornoCoordenacao({
          id: rowR.id,
          handoffId: rowR.handoff_id,
          sucesso: Boolean(rowR.sucesso),
          resultadoObservavel: rowR.resultado_observavel,
          pendenciasOuBloqueios: rowR.pendencias_ou_bloqueios ?? null,
          recebidoEm: new Date(rowR.recebido_em),
        });
        handoff.anexarRetorno(retorno);
      }

      handoffs.push(handoff);
    }

    const dependenciasParsed: string[] =
      typeof row.dependencias === "string" ? JSON.parse(row.dependencias) : (row.dependencias ?? []);

    const historicoRecuperado: RegistroHistoricoCoordenacao[] = [
      {
        id: `hist-${row.id}`,
        trabalhoId: row.id,
        ator: "PostgreSQL",
        atividade: "Recuperação do estado do banco",
        condicaoAnterior: null,
        condicaoNova: row.condicao_operacional as CondicaoOperacionalTrabalho,
        registradoEm: new Date(row.atualizado_em ?? row.criado_em),
      },
    ];

    return TrabalhoCoordenado.reconstituir(
      {
        id: row.id,
        codigo: row.codigo,
        projetoId: row.projeto_id,
        titulo: row.titulo,
        objetivo: row.objetivo,
        competenciaRequerida: row.competencia_requerida,
        atorRequerido: row.ator_requerido,
        skillRequerida: row.skill_requerida ?? null,
        executorDesignado: row.executor_designado ?? null,
        criterioTermino: row.criterio_termino,
        dependencias: dependenciasParsed,
        condicaoOperacional: row.condicao_operacional as CondicaoOperacionalTrabalho,
        motivoBloqueio: row.motivo_bloqueio ?? null,
      },
      new Date(row.criado_em),
      new Date(row.atualizado_em ?? row.criado_em),
      row.condicao_operacional as CondicaoOperacionalTrabalho,
      handoffs,
      historicoRecuperado
    );
  }
}
