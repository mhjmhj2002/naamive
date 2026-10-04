import { RegistroProveniencia, VinculoCausal } from "../../domain/contexto.js";
import {
  RepositorioContexto,
  FiltrosListagemProveniencia,
} from "../../domain/repositorio-contexto.js";
import {
  TipoEntidadeContexto,
  TipoRegistroProveniencia,
  ClassificacaoEpistemica,
  TipoRelacaoCausal,
} from "../../domain/tipos-contexto.js";
import { GerenciadorConexao } from "./conexao.js";

interface LinhaRegistroProvenienciaSql {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  codigo_referencia: string;
  tipo_registro: string;
  autor_responsavel: string;
  classificacao_epistemica: string;
  dados_contexto: any;
  vigente: boolean;
  registrado_em: string | Date;
}

interface LinhaVinculoCausalSql {
  id: string;
  origem_registro_id: string;
  destino_registro_id: string;
  tipo_relacao: string;
  justificativa: string | null;
  criado_em: string | Date;
}

/**
 * Adaptador de repositório concreto para Contexto, Proveniência e Rastreabilidade em PostgreSQL.
 * Implementa a persistência relacional transacional para registros_proveniencia e vinculos_causais,
 * com suporte a JSONB, integridade referencial ACID e total compatibilidade com pg-mem e PostgreSQL real.
 */
export class RepositorioContextoPostgres implements RepositorioContexto {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  public async salvarRegistro(registro: RegistroProveniencia): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      const sql = `
        INSERT INTO registros_proveniencia (
          id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
          autor_responsavel, classificacao_epistemica, dados_contexto, vigente, registrado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO UPDATE SET
          entidade_tipo = EXCLUDED.entidade_tipo,
          entidade_id = EXCLUDED.entidade_id,
          codigo_referencia = EXCLUDED.codigo_referencia,
          tipo_registro = EXCLUDED.tipo_registro,
          autor_responsavel = EXCLUDED.autor_responsavel,
          classificacao_epistemica = EXCLUDED.classificacao_epistemica,
          dados_contexto = EXCLUDED.dados_contexto,
          vigente = EXCLUDED.vigente,
          registrado_em = EXCLUDED.registrado_em;
      `.trim();

      await cliente.query(sql, [
        registro.id,
        registro.entidadeTipo,
        registro.entidadeId,
        registro.codigoReferencia,
        registro.tipoRegistro,
        registro.autorResponsavel,
        registro.classificacaoEpistemica,
        JSON.stringify(registro.dadosContexto),
        registro.vigente,
        registro.registradoEm,
      ]);
    });
  }

  public async obterRegistroPorId(id: string): Promise<RegistroProveniencia | null> {
    const sql = `
      SELECT id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
             autor_responsavel, classificacao_epistemica, dados_contexto, vigente, registrado_em
      FROM registros_proveniencia
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaRegistroProvenienciaSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaRegistro(linha);
  }

  public async obterRegistrosPorCodigo(codigoReferencia: string): Promise<RegistroProveniencia[]> {
    const cod = codigoReferencia.trim();
    const sql = `
      SELECT id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
             autor_responsavel, classificacao_epistemica, dados_contexto, vigente, registrado_em
      FROM registros_proveniencia
      WHERE UPPER(codigo_referencia) = UPPER($1)
      ORDER BY registrado_em DESC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaRegistroProvenienciaSql>(sql, [cod]);
    return resultado.rows.map((l) => this.converterLinhaParaRegistro(l));
  }

  public async listarRegistros(filtros?: FiltrosListagemProveniencia): Promise<RegistroProveniencia[]> {
    const condicoes: string[] = [];
    const params: any[] = [];

    if (filtros) {
      if (filtros.entidadeTipo) {
        params.push(filtros.entidadeTipo);
        condicoes.push(`entidade_tipo = $${params.length}`);
      }
      if (filtros.entidadeId) {
        params.push(filtros.entidadeId);
        condicoes.push(`entidade_id = $${params.length}`);
      }
      if (filtros.codigoReferencia) {
        params.push(filtros.codigoReferencia.trim());
        condicoes.push(`UPPER(codigo_referencia) = UPPER($${params.length})`);
      }
      if (filtros.tipoRegistro) {
        params.push(filtros.tipoRegistro);
        condicoes.push(`tipo_registro = $${params.length}`);
      }
      if (filtros.apenasVigentes !== undefined) {
        params.push(filtros.apenasVigentes);
        condicoes.push(`vigente = $${params.length}`);
      }
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";
    const sql = `
      SELECT id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
             autor_responsavel, classificacao_epistemica, dados_contexto, vigente, registrado_em
      FROM registros_proveniencia
      ${where}
      ORDER BY registrado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaRegistroProvenienciaSql>(sql, params);
    return resultado.rows.map((l) => this.converterLinhaParaRegistro(l));
  }

  public async salvarVinculo(vinculo: VinculoCausal): Promise<void> {
    await this.conexao.transacao(async (cliente) => {
      // 1. Garantir que origem e destino existem para respeitar a chave estrangeira
      const checkOrigem = await cliente.query(
        "SELECT id FROM registros_proveniencia WHERE id = $1",
        [vinculo.origemRegistroId]
      );
      if (checkOrigem.rowCount === 0) {
        throw new Error(
          `Não é possível criar vínculo causal: registro de origem '${vinculo.origemRegistroId}' não existe.`
        );
      }

      const checkDestino = await cliente.query(
        "SELECT id FROM registros_proveniencia WHERE id = $1",
        [vinculo.destinoRegistroId]
      );
      if (checkDestino.rowCount === 0) {
        throw new Error(
          `Não é possível criar vínculo causal: registro de destino '${vinculo.destinoRegistroId}' não existe.`
        );
      }

      const sql = `
        INSERT INTO vinculos_causais (
          id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa, criado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        ON CONFLICT (origem_registro_id, destino_registro_id, tipo_relacao) DO UPDATE SET
          justificativa = EXCLUDED.justificativa;
      `.trim();

      await cliente.query(sql, [
        vinculo.id,
        vinculo.origemRegistroId,
        vinculo.destinoRegistroId,
        vinculo.tipoRelacao,
        vinculo.justificativa,
        vinculo.criadoEm,
      ]);
    });
  }

  public async obterVinculoPorId(id: string): Promise<VinculoCausal | null> {
    const sql = `
      SELECT id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa, criado_em
      FROM vinculos_causais
      WHERE id = $1;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaVinculoCausalSql>(sql, [id]);
    const linha = resultado.rows[0];
    if (!linha) return null;

    return this.converterLinhaParaVinculo(linha);
  }

  public async listarVinculosPorRegistro(registroId: string): Promise<VinculoCausal[]> {
    const sql = `
      SELECT id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa, criado_em
      FROM vinculos_causais
      WHERE origem_registro_id = $1 OR destino_registro_id = $1
      ORDER BY criado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaVinculoCausalSql>(sql, [registroId]);
    return resultado.rows.map((l) => this.converterLinhaParaVinculo(l));
  }

  public async listarTodosVinculos(): Promise<VinculoCausal[]> {
    const sql = `
      SELECT id, origem_registro_id, destino_registro_id, tipo_relacao, justificativa, criado_em
      FROM vinculos_causais
      ORDER BY criado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaVinculoCausalSql>(sql);
    return resultado.rows.map((l) => this.converterLinhaParaVinculo(l));
  }

  public async listarTodosRegistros(): Promise<RegistroProveniencia[]> {
    const sql = `
      SELECT id, entidade_tipo, entidade_id, codigo_referencia, tipo_registro,
             autor_responsavel, classificacao_epistemica, dados_contexto, vigente, registrado_em
      FROM registros_proveniencia
      ORDER BY registrado_em ASC;
    `.trim();

    const resultado = await this.conexao.executarConsulta<LinhaRegistroProvenienciaSql>(sql);
    return resultado.rows.map((l) => this.converterLinhaParaRegistro(l));
  }

  private converterLinhaParaRegistro(l: LinhaRegistroProvenienciaSql): RegistroProveniencia {
    let dadosContextoObj: Record<string, unknown> = {};
    if (typeof l.dados_contexto === "string") {
      try {
        dadosContextoObj = JSON.parse(l.dados_contexto);
      } catch {
        dadosContextoObj = {};
      }
    } else if (typeof l.dados_contexto === "object" && l.dados_contexto !== null) {
      dadosContextoObj = l.dados_contexto;
    }

    return new RegistroProveniencia({
      id: l.id,
      entidadeTipo: l.entidade_tipo as TipoEntidadeContexto,
      entidadeId: l.entidade_id,
      codigoReferencia: l.codigo_referencia,
      tipoRegistro: l.tipo_registro as TipoRegistroProveniencia,
      autorResponsavel: l.autor_responsavel,
      classificacaoEpistemica: l.classificacao_epistemica as ClassificacaoEpistemica,
      dadosContexto: dadosContextoObj,
      vigente: Boolean(l.vigente),
      registradoEm: typeof l.registrado_em === "string" ? new Date(l.registrado_em) : l.registrado_em,
    });
  }

  private converterLinhaParaVinculo(l: LinhaVinculoCausalSql): VinculoCausal {
    return new VinculoCausal({
      id: l.id,
      origemRegistroId: l.origem_registro_id,
      destinoRegistroId: l.destino_registro_id,
      tipoRelacao: l.tipo_relacao as TipoRelacaoCausal,
      justificativa: l.justificativa,
      criadoEm: typeof l.criado_em === "string" ? new Date(l.criado_em) : l.criado_em,
    });
  }
}
