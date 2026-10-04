-- Migração 003: Esquema Relacional de Projetos, Etapas de Formação, Auditorias e Direções (M-002)
-- Suporte a PostgreSQL ANSI e pg-mem com restrições explícitas de integridade.
-- Invariante nuclear: Vínculo exclusivo 1:1 entre Necessidade e Projeto (UNIQUE(necessidade_id)).

CREATE TABLE IF NOT EXISTS projetos (
    id VARCHAR(64) NOT NULL,
    codigo VARCHAR(32) NOT NULL,
    necessidade_id VARCHAR(64) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    status VARCHAR(64) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_projetos PRIMARY KEY (id),
    CONSTRAINT uq_projetos_codigo UNIQUE (codigo),
    CONSTRAINT uq_projetos_necessidade_id UNIQUE (necessidade_id),
    CONSTRAINT fk_projetos_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_projetos_necessidade_id ON projetos(necessidade_id);

-- Etapas de Formação do Projeto (ENQUADRAMENTO, DESCOBERTA, DIREÇÃO DA SOLUÇÃO)
CREATE TABLE IF NOT EXISTS etapas_formacao_projeto (
    id VARCHAR(64) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    etapa VARCHAR(64) NOT NULL,
    conteudo JSONB NOT NULL,
    registrado_por VARCHAR(128) NOT NULL,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_etapas_formacao_projeto PRIMARY KEY (id),
    CONSTRAINT fk_etapas_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_etapas_projeto_id ON etapas_formacao_projeto(projeto_id);
CREATE INDEX IF NOT EXISTS idx_etapas_registrado_em ON etapas_formacao_projeto(registrado_em);

-- Auditorias do Projeto (Pareceres FORMACAO_SUFICIENTE, FORMACAO_INSUFICIENTE)
CREATE TABLE IF NOT EXISTS auditorias_projeto (
    id VARCHAR(64) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    resultado VARCHAR(64) NOT NULL,
    parecer TEXT NOT NULL,
    auditor VARCHAR(128) NOT NULL,
    auditado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_auditorias_projeto PRIMARY KEY (id),
    CONSTRAINT fk_auditorias_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auditorias_projeto_id ON auditorias_projeto(projeto_id);

-- Direções Consolidadas do Projeto (Consolidada após FORMACAO_SUFICIENTE)
-- Invariante: 1 Projeto -> exatamente 1 Direção aprovada
CREATE TABLE IF NOT EXISTS direcoes_projeto (
    id VARCHAR(64) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    compromisso_origem TEXT NOT NULL,
    objetivo_projeto TEXT NOT NULL,
    fronteiras TEXT NOT NULL,
    contexto_relevante TEXT NOT NULL,
    aprovado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_direcoes_projeto PRIMARY KEY (id),
    CONSTRAINT uq_direcoes_projeto_id UNIQUE (projeto_id),
    CONSTRAINT fk_direcoes_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_direcoes_projeto_id ON direcoes_projeto(projeto_id);
