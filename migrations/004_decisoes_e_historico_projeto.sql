-- Migração 004: Tabela de Decisões do Owner e Histórico de Atividades do Projeto (M-002)
-- Complementa a rastreabilidade imutável de decisões materiais (ex: CANCELAMENTO_APROVADO) e histórico de atividades do Projeto.

CREATE TABLE IF NOT EXISTS decisoes_owner_projeto (
    id VARCHAR(64) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    decisao VARCHAR(64) NOT NULL,
    usuario_autenticado VARCHAR(128) NOT NULL,
    justificativa TEXT,
    decidido_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_decisoes_owner_projeto PRIMARY KEY (id),
    CONSTRAINT fk_decisoes_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_decisoes_projeto_id ON decisoes_owner_projeto(projeto_id);
CREATE INDEX IF NOT EXISTS idx_decisoes_projeto_usuario ON decisoes_owner_projeto(usuario_autenticado);

CREATE TABLE IF NOT EXISTS historico_atividades_projeto (
    id VARCHAR(64) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    ator_competente VARCHAR(128) NOT NULL,
    atividade VARCHAR(128) NOT NULL,
    status_anterior VARCHAR(64),
    status_novo VARCHAR(64),
    detalhes JSONB,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_historico_atividades_projeto PRIMARY KEY (id),
    CONSTRAINT fk_historico_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_historico_projeto_id ON historico_atividades_projeto(projeto_id);
CREATE INDEX IF NOT EXISTS idx_historico_projeto_registrado_em ON historico_atividades_projeto(registrado_em);
