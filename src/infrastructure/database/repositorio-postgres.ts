import { Necessidade } from "../../domain/necessidade.js";
import { CompromissoNecessidade } from "../../domain/valores.js";
import { RepositorioNecessidade } from "../../domain/repositorio-necessidade.js";
import { GerenciadorConexao } from "./conexao.js";

/**
 * Adaptador de repositório da Necessidade em PostgreSQL.
 * Implementa a interface de persistência isolada do domínio.
 */
export class RepositorioNecessidadePostgres implements RepositorioNecessidade {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  public async salvar(necessidade: Necessidade): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // 1. Upsert da Necessidade
      const sqlNecessidade = `
        INSERT INTO necessidade (
          id, codigo, titulo, tipo, problema_ou_oportunidade, quem_e_afetado,
          resultado_pretendido, escopo_inicial, fora_de_escopo, criterio_de_atendimento,
          por_que_isso_importa, restricoes_ou_dependencias, origem, status, atualizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          tipo = EXCLUDED.tipo,
          problema_ou_oportunidade = EXCLUDED.problema_ou_oportunidade,
          quem_e_afetado = EXCLUDED.quem_e_afetado,
          resultado_pretendido = EXCLUDED.resultado_pretendido,
          escopo_inicial = EXCLUDED.escopo_inicial,
          fora_de_escopo = EXCLUDED.fora_de_escopo,
          criterio_de_atendimento = EXCLUDED.criterio_de_atendimento,
          por_que_isso_importa = EXCLUDED.por_que_isso_importa,
          restricoes_ou_dependencias = EXCLUDED.restricoes_ou_dependencias,
          origem = EXCLUDED.origem,
          status = EXCLUDED.status,
          atualizado_em = now();
      `;

      await cliente.query(sqlNecessidade, [
        necessidade.id,
        necessidade.codigo,
        necessidade.titulo,
        necessidade.tipo,
        necessidade.problemaOuOportunidade,
        necessidade.quemEAfetado,
        necessidade.resultadoPretendido,
        necessidade.escopoInicial,
        necessidade.foraDeEscopo,
        necessidade.criterioDeAtendimento,
        necessidade.porQueIssoImporta,
        necessidade.restricoesOuDependencias,
        necessidade.origem,
        necessidade.status,
      ]);

      // 2. Histórico de Atividades
      for (const hist of necessidade.historico) {
        const sqlHist = `
          INSERT INTO historico_atividades (
            id, necessidade_id, ator_competente, atividade, status_anterior, status_novo, detalhes, registrado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlHist, [
          hist.id,
          necessidade.id,
          hist.atorCompetente,
          hist.atividade,
          hist.statusAnterior,
          hist.statusNovo,
          hist.detalhes ? JSON.stringify(hist.detalhes) : null,
          hist.registradoEm,
        ]);
      }

      // 3. Resultados do Processo
      for (const res of necessidade.resultados) {
        const sqlRes = `
          INSERT INTO resultados_processo (
            id, necessidade_id, ator_competente, tipo_resultado, conteudo, emitido_em
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlRes, [
          res.id,
          necessidade.id,
          res.atorCompetente,
          res.tipoResultado,
          res.conteudo ? JSON.stringify(res.conteudo) : null,
          res.emitidoEm,
        ]);
      }

      // 4. Decisões do Owner
      for (const dec of necessidade.decisoes) {
        const sqlDec = `
          INSERT INTO decisoes_owner (
            id, necessidade_id, decisao, usuario_autenticado, justificativa, decidido_em
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlDec, [
          dec.id,
          necessidade.id,
          dec.decisao,
          dec.usuarioAutenticado,
          dec.justificativa ?? null,
          dec.decididoEm,
        ]);
      }

      // 5. Compromisso consolidado
      if (necessidade.compromisso) {
        const comp = necessidade.compromisso;
        const sqlComp = `
          INSERT INTO compromissos (
            id, necessidade_id, problema_assumido, resultado_pretendido, escopo_assumido,
            fora_de_escopo, criterio_de_atendimento, restricoes_a_preservar,
            contexto_relevante, decisao_id, usuario_aprovador, consolidado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (necessidade_id) DO UPDATE SET
            problema_assumido = EXCLUDED.problema_assumido,
            resultado_pretendido = EXCLUDED.resultado_pretendido,
            escopo_assumido = EXCLUDED.escopo_assumido,
            fora_de_escopo = EXCLUDED.fora_de_escopo,
            criterio_de_atendimento = EXCLUDED.criterio_de_atendimento,
            restricoes_a_preservar = EXCLUDED.restricoes_a_preservar,
            contexto_relevante = EXCLUDED.contexto_relevante,
            decisao_id = EXCLUDED.decisao_id,
            usuario_aprovador = EXCLUDED.usuario_aprovador,
            consolidado_em = EXCLUDED.consolidado_em;
        `;
        await cliente.query(sqlComp, [
          comp.id,
          comp.necessidadeId,
          comp.problemaAssumido,
          comp.resultadoPretendido,
          comp.escopoAssumido,
          comp.foraDeEscopo,
          comp.criterioDeAtendimento,
          comp.restricoesAPreservar,
          comp.contextoRelevante,
          comp.decisaoId,
          comp.usuarioAprovador,
          comp.consolidadoEm,
        ]);
      }
    });
  }

  public async obterPorId(id: string): Promise<Necessidade | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM necessidade WHERE id = $1",
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarNecessidade(res.rows[0]);
  }

  public async obterPorCodigo(codigo: string): Promise<Necessidade | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM necessidade WHERE codigo = $1",
      [codigo]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarNecessidade(res.rows[0]);
  }

  public async obterCompromisso(necessidadeId: string): Promise<CompromissoNecessidade | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM compromissos WHERE necessidade_id = $1",
      [necessidadeId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      necessidadeId: r.necessidade_id,
      problemaAssumido: r.problema_assumido,
      resultadoPretendido: r.resultado_pretendido,
      escopoAssumido: r.escopo_assumido,
      foraDeEscopo: r.fora_de_escopo,
      criterioDeAtendimento: r.criterio_de_atendimento,
      restricoesAPreservar: r.restricoes_a_preservar,
      contextoRelevante: r.contexto_relevante,
      decisaoId: r.decisao_id,
      usuarioAprovador: r.usuario_aprovador,
      consolidadoEm: new Date(r.consolidado_em),
    };
  }

  public async listarTodas(): Promise<Necessidade[]> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM necessidade ORDER BY criado_em ASC"
    );
    const lista: Necessidade[] = [];
    for (const row of res.rows) {
      lista.push(await this.hidratarNecessidade(row));
    }
    return lista;
  }

  private async hidratarNecessidade(row: any): Promise<Necessidade> {
    const nec = new Necessidade(
      {
        id: row.id,
        codigo: row.codigo,
        titulo: row.titulo,
        tipo: row.tipo,
        problemaOuOportunidade: row.problema_ou_oportunidade,
        quemEAfetado: row.quem_e_afetado,
        resultadoPretendido: row.resultado_pretendido,
        escopoInicial: row.escopo_inicial,
        foraDeEscopo: row.fora_de_escopo,
        criterioDeAtendimento: row.criterio_de_atendimento,
        porQueIssoImporta: row.por_que_isso_importa,
        restricoesOuDependencias: row.restricoes_ou_dependencias,
        origem: row.origem,
      },
      new Date(row.criado_em)
    );

    // Carrega histórico
    const resHist = await this.conexao.executarConsulta(
      "SELECT * FROM historico_atividades WHERE necessidade_id = $1 ORDER BY registrado_em ASC",
      [row.id]
    );
    for (const h of resHist.rows) {
      if (h.atividade !== "Criação da Necessidade") {
        const detalhes = typeof h.detalhes === "string" ? JSON.parse(h.detalhes) : h.detalhes;
        if (detalhes?.projetoId) {
          (nec as any)._projetoId = detalhes.projetoId;
        }
        (nec as any)._historico.push({
          id: h.id,
          necessidadeId: h.necessidade_id,
          atorCompetente: h.ator_competente,
          atividade: h.atividade,
          statusAnterior: h.status_anterior,
          statusNovo: h.status_novo,
          detalhes,
          registradoEm: new Date(h.registrado_em),
        });
      }
    }

    // Carrega resultados
    const resResultados = await this.conexao.executarConsulta(
      "SELECT * FROM resultados_processo WHERE necessidade_id = $1 ORDER BY emitido_em ASC",
      [row.id]
    );
    for (const r of resResultados.rows) {
      (nec as any)._resultados.push({
        id: r.id,
        necessidadeId: r.necessidade_id,
        atorCompetente: r.ator_competente,
        tipoResultado: r.tipo_resultado,
        conteudo: typeof r.conteudo === "string" ? JSON.parse(r.conteudo) : r.conteudo,
        emitidoEm: new Date(r.emitido_em),
      });
    }

    // Carrega decisões
    const resDecisoes = await this.conexao.executarConsulta(
      "SELECT * FROM decisoes_owner WHERE necessidade_id = $1 ORDER BY decidido_em ASC",
      [row.id]
    );
    for (const d of resDecisoes.rows) {
      (nec as any)._decisoes.push({
        id: d.id,
        necessidadeId: d.necessidade_id,
        decisao: d.decisao,
        usuarioAutenticado: d.usuario_autenticado,
        justificativa: d.justificativa,
        decididoEm: new Date(d.decidido_em),
      });
    }

    // Carrega compromisso se houver
    const comp = await this.obterCompromisso(row.id);
    if (comp) {
      (nec as any)._compromisso = comp;
    }

    (nec as any)._status = row.status;
    (nec as any)._atualizadoEm = new Date(row.atualizado_em);

    return nec;
  }
}
