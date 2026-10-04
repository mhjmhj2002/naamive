-- Migração 002: Tabela de Tarefas Assíncronas (Fila de Jobs do Worker)
-- Permite processamento desacoplado em background com transações e controle de status.

CREATE TABLE IF NOT EXISTS tarefas_trabalho (
    id VARCHAR(64) NOT NULL,
    tipo VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE',
    tentativas INT NOT NULL DEFAULT 0,
    max_tentativas INT NOT NULL DEFAULT 3,
    erro_ultimo TEXT,
    agendado_para TIMESTAMPTZ DEFAULT now(),
    criado_em TIMESTAMPTZ DEFAULT now(),
    executado_em TIMESTAMPTZ,
    CONSTRAINT pk_tarefas_trabalho PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tarefas_status_agendamento ON tarefas_trabalho(status, agendado_para);
