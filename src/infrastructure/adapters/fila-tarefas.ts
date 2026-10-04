import { GerenciadorConexao } from "../database/conexao.js";

export type StatusTarefa = "PENDENTE" | "PROCESSANDO" | "CONCLUIDA" | "FALHA";

export interface TarefaTrabalho<T = Record<string, unknown>> {
  id: string;
  tipo: string;
  payload: T;
  status: StatusTarefa;
  tentativas: number;
  maxTentativas: number;
  erroUltimo?: string | null;
  agendadoPara: Date;
  criadoEm: Date;
  executadoEm?: Date | null;
}

export interface FilaTarefas {
  enfileirar<T = Record<string, unknown>>(
    tipo: string,
    payload: T,
    agendadoPara?: Date
  ): Promise<TarefaTrabalho<T>>;
  obterProximaTarefa(): Promise<TarefaTrabalho | null>;
  concluirTarefa(id: string): Promise<void>;
  falharTarefa(id: string, erro: string): Promise<void>;
}

/**
 * Fila de tarefas persistida em PostgreSQL (usando tabela tarefas_trabalho).
 * Fornece isolamento transacional e consistência para processamento assíncrono.
 */
export class FilaTarefasPostgres implements FilaTarefas {
  private conexao: GerenciadorConexao;

  constructor(conexao: GerenciadorConexao) {
    this.conexao = conexao;
  }

  public async enfileirar<T = Record<string, unknown>>(
    tipo: string,
    payload: T,
    agendadoPara: Date = new Date()
  ): Promise<TarefaTrabalho<T>> {
    const id = `tarf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const sql = `
      INSERT INTO tarefas_trabalho (
        id, tipo, payload, status, tentativas, max_tentativas, agendado_para, criado_em
      ) VALUES ($1, $2, $3, 'PENDENTE', 0, 3, $4, now())
      RETURNING id, tipo, payload, status, tentativas, max_tentativas, erro_ultimo, agendado_para, criado_em, executado_em;
    `.trim();

    const resultado = await this.conexao.executarConsulta(sql, [
      id,
      tipo,
      JSON.stringify(payload),
      agendadoPara,
    ]);

    const row = resultado.rows[0];
    return {
      id: row.id,
      tipo: row.tipo,
      payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
      status: row.status as StatusTarefa,
      tentativas: row.tentativas,
      maxTentativas: row.max_tentativas,
      erroUltimo: row.erro_ultimo,
      agendadoPara: new Date(row.agendado_para),
      criadoEm: new Date(row.criado_em),
      executadoEm: row.executado_em ? new Date(row.executado_em) : null,
    };
  }

  public async obterProximaTarefa(): Promise<TarefaTrabalho | null> {
    // Busca a tarefa pendente mais antiga agendada para agora ou antes, e marca como PROCESSANDO
    return this.conexao.transacao(async (cliente) => {
      const selectSql = `
        SELECT id, tipo, payload, status, tentativas, max_tentativas, erro_ultimo, agendado_para, criado_em, executado_em
        FROM tarefas_trabalho
        WHERE status = 'PENDENTE' AND agendado_para <= now()
        ORDER BY agendado_para ASC, criado_em ASC
        LIMIT 1
      `;
      const res = await cliente.query(selectSql);
      if (res.rows.length === 0) {
        return null;
      }

      const row = res.rows[0];
      const updateSql = `
        UPDATE tarefas_trabalho
        SET status = 'PROCESSANDO', tentativas = tentativas + 1
        WHERE id = $1
      `;
      await cliente.query(updateSql, [row.id]);

      return {
        id: row.id,
        tipo: row.tipo,
        payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
        status: "PROCESSANDO" as StatusTarefa,
        tentativas: row.tentativas + 1,
        maxTentativas: row.max_tentativas,
        erroUltimo: row.erro_ultimo,
        agendadoPara: new Date(row.agendado_para),
        criadoEm: new Date(row.criado_em),
        executadoEm: row.executado_em ? new Date(row.executado_em) : null,
      };
    });
  }

  public async concluirTarefa(id: string): Promise<void> {
    const sql = `
      UPDATE tarefas_trabalho
      SET status = 'CONCLUIDA', executado_em = now()
      WHERE id = $1
    `;
    await this.conexao.executarConsulta(sql, [id]);
  }

  public async falharTarefa(id: string, erro: string): Promise<void> {
    const sql = `
      UPDATE tarefas_trabalho
      SET status = CASE WHEN tentativas >= max_tentativas THEN 'FALHA' ELSE 'PENDENTE' END,
          erro_ultimo = $2,
          executado_em = now()
      WHERE id = $1
    `;
    await this.conexao.executarConsulta(sql, [id, erro]);
  }
}

/**
 * Fila em memória para execução ultrarrápida em testes ou ambientes sem banco real ativo.
 */
export class FilaTarefasMemoria implements FilaTarefas {
  private tarefas: Map<string, TarefaTrabalho> = new Map();

  public async enfileirar<T = Record<string, unknown>>(
    tipo: string,
    payload: T,
    agendadoPara: Date = new Date()
  ): Promise<TarefaTrabalho<T>> {
    const id = `tarf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tarefa: TarefaTrabalho<T> = {
      id,
      tipo,
      payload,
      status: "PENDENTE",
      tentativas: 0,
      maxTentativas: 3,
      agendadoPara,
      criadoEm: new Date(),
      executadoEm: null,
    };
    this.tarefas.set(id, tarefa as unknown as TarefaTrabalho);
    return tarefa;
  }

  public async obterProximaTarefa(): Promise<TarefaTrabalho | null> {
    const agora = new Date();
    for (const [id, t] of this.tarefas.entries()) {
      if (t.status === "PENDENTE" && t.agendadoPara <= agora) {
        t.status = "PROCESSANDO";
        t.tentativas += 1;
        this.tarefas.set(id, t);
        return { ...t };
      }
    }
    return null;
  }

  public async concluirTarefa(id: string): Promise<void> {
    const t = this.tarefas.get(id);
    if (t) {
      t.status = "CONCLUIDA";
      t.executadoEm = new Date();
      this.tarefas.set(id, t);
    }
  }

  public async falharTarefa(id: string, erro: string): Promise<void> {
    const t = this.tarefas.get(id);
    if (t) {
      t.erroUltimo = erro;
      t.executadoEm = new Date();
      t.status = t.tentativas >= t.maxTentativas ? "FALHA" : "PENDENTE";
      this.tarefas.set(id, t);
    }
  }
}
