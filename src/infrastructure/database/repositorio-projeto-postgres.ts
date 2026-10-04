import { Projeto } from "../../domain/projeto.js";
import { RepositorioProjeto } from "../../domain/repositorio-projeto.js";
import { GerenciadorConexao } from "./conexao.js";
import {
  StatusProjeto,
  EtapaFormacaoProjeto,
  TipoResultadoProcessoProjeto,
  DecisaoMaterialOwnerProjeto,
} from "../../domain/tipos-projeto.js";
import {
  RegistroEtapaFormacaoProjeto,
  RegistroAuditoriaProjeto,
  RegistroDecisaoOwnerProjeto,
  RegistroHistoricoProjeto,
  DirecaoProjeto,
} from "../../domain/valores-projeto.js";

/**
 * Adaptador de repositório concreto para a entidade Projeto em PostgreSQL.
 * Implementa a interface pura RepositorioProjeto com suporte a operações transacionais
 * e garantia de unicidade estrita 1:1 com a Necessidade de origem (UNIQUE(necessidade_id)).
 */
export class RepositorioProjetoPostgres implements RepositorioProjeto {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  public async salvar(projeto: Projeto): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // 1. Upsert da entidade raiz projetos
      const sqlProjeto = `
        INSERT INTO projetos (
          id, codigo, necessidade_id, titulo, status, atualizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          titulo = EXCLUDED.titulo,
          status = EXCLUDED.status,
          atualizado_em = now();
      `;

      await cliente.query(sqlProjeto, [
        projeto.id,
        projeto.codigo,
        projeto.necessidadeId,
        projeto.titulo,
        projeto.status,
      ]);

      // 2. Etapas de Formação
      for (const etapa of projeto.etapas) {
        const sqlEtapa = `
          INSERT INTO etapas_formacao_projeto (
            id, projeto_id, etapa, conteudo, registrado_por, registrado_em
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlEtapa, [
          etapa.id,
          projeto.id,
          etapa.etapa,
          JSON.stringify(etapa.conteudo),
          etapa.registradoPor,
          etapa.registradoEm,
        ]);
      }

      // 3. Auditorias do Projeto
      for (const aud of projeto.auditorias) {
        const sqlAud = `
          INSERT INTO auditorias_projeto (
            id, projeto_id, resultado, parecer, auditor, auditado_em
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlAud, [
          aud.id,
          projeto.id,
          aud.resultado,
          aud.parecer,
          aud.auditor,
          aud.auditadoEm,
        ]);
      }

      // 4. Direção Consolidada do Projeto
      if (projeto.direcao) {
        const dir = projeto.direcao;
        const sqlDir = `
          INSERT INTO direcoes_projeto (
            id, projeto_id, compromisso_origem, objetivo_projeto, fronteiras, contexto_relevante, aprovado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (projeto_id) DO UPDATE SET
            compromisso_origem = EXCLUDED.compromisso_origem,
            objetivo_projeto = EXCLUDED.objetivo_projeto,
            fronteiras = EXCLUDED.fronteiras,
            contexto_relevante = EXCLUDED.contexto_relevante,
            aprovado_em = EXCLUDED.aprovado_em;
        `;
        await cliente.query(sqlDir, [
          dir.id,
          projeto.id,
          dir.compromissoOrigem,
          dir.objetivoProjeto,
          dir.fronteiras,
          dir.contextoRelevante,
          dir.aprovadoEm,
        ]);
      }

      // 5. Decisões do Owner
      for (const dec of projeto.decisoes) {
        const sqlDec = `
          INSERT INTO decisoes_owner_projeto (
            id, projeto_id, decisao, usuario_autenticado, justificativa, decidido_em
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlDec, [
          dec.id,
          projeto.id,
          dec.decisao,
          dec.usuarioAutenticado,
          dec.justificativa ?? null,
          dec.decididoEm,
        ]);
      }

      // 6. Histórico de Atividades
      for (const hist of projeto.historico) {
        const sqlHist = `
          INSERT INTO historico_atividades_projeto (
            id, projeto_id, ator_competente, atividade, status_anterior, status_novo, detalhes, registrado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `;
        await cliente.query(sqlHist, [
          hist.id,
          projeto.id,
          hist.atorCompetente,
          hist.atividade,
          hist.statusAnterior,
          hist.statusNovo,
          hist.detalhes ? JSON.stringify(hist.detalhes) : null,
          hist.registradoEm,
        ]);
      }
    });
  }

  public async obterPorId(id: string): Promise<Projeto | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM projetos WHERE id = $1",
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarProjeto(res.rows[0]);
  }

  public async obterPorCodigo(codigo: string): Promise<Projeto | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM projetos WHERE codigo = $1",
      [codigo]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarProjeto(res.rows[0]);
  }

  public async obterPorNecessidadeId(necessidadeId: string): Promise<Projeto | null> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM projetos WHERE necessidade_id = $1",
      [necessidadeId]
    );
    if (res.rows.length === 0) return null;
    return this.hidratarProjeto(res.rows[0]);
  }

  public async listarTodos(): Promise<Projeto[]> {
    const res = await this.conexao.executarConsulta(
      "SELECT * FROM projetos ORDER BY criado_em ASC"
    );
    const lista: Projeto[] = [];
    for (const row of res.rows) {
      lista.push(await this.hidratarProjeto(row));
    }
    return lista;
  }

  private async hidratarProjeto(row: any): Promise<Projeto> {
    const projetoId = row.id;

    // Carregar Etapas
    const resEtapas = await this.conexao.executarConsulta(
      "SELECT * FROM etapas_formacao_projeto WHERE projeto_id = $1 ORDER BY registrado_em ASC",
      [projetoId]
    );
    const etapas: RegistroEtapaFormacaoProjeto[] = resEtapas.rows.map((r: any) => ({
      id: r.id,
      projetoId: r.projeto_id,
      etapa: r.etapa as EtapaFormacaoProjeto,
      conteudo: typeof r.conteudo === "string" ? JSON.parse(r.conteudo) : r.conteudo,
      registradoPor: r.registrado_por,
      registradoEm: new Date(r.registrado_em),
    }));

    // Carregar Auditorias
    const resAud = await this.conexao.executarConsulta(
      "SELECT * FROM auditorias_projeto WHERE projeto_id = $1 ORDER BY auditado_em ASC",
      [projetoId]
    );
    const auditorias: RegistroAuditoriaProjeto[] = resAud.rows.map((r: any) => ({
      id: r.id,
      projetoId: r.projeto_id,
      resultado: r.resultado as TipoResultadoProcessoProjeto,
      parecer: r.parecer,
      auditor: r.auditor,
      auditadoEm: new Date(r.auditado_em),
    }));

    // Carregar Decisões
    const resDec = await this.conexao.executarConsulta(
      "SELECT * FROM decisoes_owner_projeto WHERE projeto_id = $1 ORDER BY decidido_em ASC",
      [projetoId]
    );
    const decisoes: RegistroDecisaoOwnerProjeto[] = resDec.rows.map((r: any) => ({
      id: r.id,
      projetoId: r.projeto_id,
      decisao: r.decisao as DecisaoMaterialOwnerProjeto,
      usuarioAutenticado: r.usuario_autenticado,
      justificativa: r.justificativa ?? undefined,
      decididoEm: new Date(r.decidido_em),
    }));

    // Carregar Histórico
    const resHist = await this.conexao.executarConsulta(
      "SELECT * FROM historico_atividades_projeto WHERE projeto_id = $1 ORDER BY registrado_em ASC",
      [projetoId]
    );
    const historico: RegistroHistoricoProjeto[] = resHist.rows.map((r: any) => ({
      id: r.id,
      projetoId: r.projeto_id,
      atorCompetente: r.ator_competente,
      atividade: r.atividade,
      statusAnterior: r.status_anterior as StatusProjeto | null,
      statusNovo: r.status_novo as StatusProjeto | null,
      detalhes: typeof r.detalhes === "string" ? JSON.parse(r.detalhes) : (r.detalhes ?? undefined),
      registradoEm: new Date(r.registrado_em),
    }));

    // Carregar Direção
    const resDir = await this.conexao.executarConsulta(
      "SELECT * FROM direcoes_projeto WHERE projeto_id = $1",
      [projetoId]
    );
    let direcao: DirecaoProjeto | null = null;
    if (resDir.rows.length > 0) {
      const d = resDir.rows[0];
      direcao = {
        id: d.id,
        projetoId: d.projeto_id,
        compromissoOrigem: d.compromisso_origem,
        objetivoProjeto: d.objetivo_projeto,
        fronteiras: d.fronteiras,
        contextoRelevante: d.contexto_relevante,
        aprovadoEm: new Date(d.aprovado_em),
      };
    }

    return Projeto.reconstituir(
      {
        id: row.id,
        codigo: row.codigo,
        necessidadeId: row.necessidade_id,
        titulo: row.titulo,
      },
      row.status as StatusProjeto,
      new Date(row.criado_em),
      new Date(row.atualizado_em),
      etapas,
      auditorias,
      decisoes,
      historico,
      direcao
    );
  }
}
