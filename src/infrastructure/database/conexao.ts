import pg from "pg";
import type { ConfiguracaoBancoDados } from "../../config/ambiente.js";

const { Pool } = pg;

export class GerenciadorConexao {
  private pool: pg.Pool;

  constructor(configuracao?: ConfiguracaoBancoDados, poolInjetado?: pg.Pool) {
    if (poolInjetado) {
      this.pool = poolInjetado;
      return;
    }

    if (configuracao?.url) {
      this.pool = new Pool({
        connectionString: configuracao.url,
        max: configuracao.maxConexoes ?? 10
      });
    } else {
      this.pool = new Pool({
        host: configuracao?.host ?? "127.0.0.1",
        port: configuracao?.port ?? 5432,
        database: configuracao?.database ?? "naamive",
        user: configuracao?.user ?? "postgres",
        password: configuracao?.password ?? "",
        max: configuracao?.maxConexoes ?? 10
      });
    }
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async executarConsulta<T extends pg.QueryResultRow = any>(
    texto: string,
    parametros: unknown[] = []
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(texto, parametros);
  }

  public async transacao<T>(
    operacao: (cliente: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query("BEGIN");
      const resultado = await operacao(cliente);
      await cliente.query("COMMIT");
      return resultado;
    } catch (erro) {
      await cliente.query("ROLLBACK");
      throw erro;
    } finally {
      cliente.release();
    }
  }

  public async encerrar(): Promise<void> {
    await this.pool.end();
  }
}
