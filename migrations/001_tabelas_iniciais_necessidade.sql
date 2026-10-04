-- Migração 001: Esquema Relacional Inicial da Necessidade e Realização
-- Criação das tabelas centrais garantindo a separação rigorosa entre estado atual, histórico de atividades,
-- resultados do processo, decisões do owner e compromissos consolidados.
-- Padrão ANSI SQL / PostgreSQL com restrições explícitas de tabela para máxima portabilidade.

CREATE TABLE IF NOT EXISTS necessidade (
    id VARCHAR(64) NOT NULL,
    codigo VARCHAR(32) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(64) NOT NULL,
    problema_ou_oportunidade TEXT NOT NULL,
    quem_e_afetado TEXT NOT NULL,
    resultado_pretendido TEXT NOT NULL,
    escopo_inicial TEXT NOT NULL,
    fora_de_escopo TEXT NOT NULL,
    criterio_de_atendimento TEXT NOT NULL,
    por_que_isso_importa TEXT NOT NULL,
    restricoes_ou_dependencias TEXT NOT NULL,
    origem TEXT NOT NULL,
    status VARCHAR(64) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_necessidade PRIMARY KEY (id),
    CONSTRAINT uq_necessidade_codigo UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_necessidade_status ON necessidade(status);
CREATE INDEX IF NOT EXISTS idx_necessidade_codigo ON necessidade(codigo);

-- Histórico de Atividades imutável
CREATE TABLE IF NOT EXISTS historico_atividades (
    id VARCHAR(64) NOT NULL,
    necessidade_id VARCHAR(64) NOT NULL,
    ator_competente VARCHAR(128) NOT NULL,
    atividade VARCHAR(128) NOT NULL,
    status_anterior VARCHAR(64),
    status_novo VARCHAR(64),
    detalhes JSONB,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_historico_atividades PRIMARY KEY (id),
    CONSTRAINT fk_historico_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_historico_necessidade_id ON historico_atividades(necessidade_id);
CREATE INDEX IF NOT EXISTS idx_historico_registrado_em ON historico_atividades(registrado_em);

-- Resultados do Processo formais
CREATE TABLE IF NOT EXISTS resultados_processo (
    id VARCHAR(64) NOT NULL,
    necessidade_id VARCHAR(64) NOT NULL,
    ator_competente VARCHAR(128) NOT NULL,
    tipo_resultado VARCHAR(128) NOT NULL,
    conteudo JSONB,
    emitido_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_resultados_processo PRIMARY KEY (id),
    CONSTRAINT fk_resultados_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_resultados_necessidade_id ON resultados_processo(necessidade_id);

-- Decisões Materiais do Owner (exige usuário autenticado)
CREATE TABLE IF NOT EXISTS decisoes_owner (
    id VARCHAR(64) NOT NULL,
    necessidade_id VARCHAR(64) NOT NULL,
    decisao VARCHAR(64) NOT NULL,
    usuario_autenticado VARCHAR(128) NOT NULL,
    justificativa TEXT,
    decidido_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_decisoes_owner PRIMARY KEY (id),
    CONSTRAINT fk_decisoes_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_decisoes_necessidade_id ON decisoes_owner(necessidade_id);
CREATE INDEX IF NOT EXISTS idx_decisoes_usuario ON decisoes_owner(usuario_autenticado);

-- Compromissos Consolidados da Necessidade (apenas após APROVADO)
CREATE TABLE IF NOT EXISTS compromissos (
    id VARCHAR(64) NOT NULL,
    necessidade_id VARCHAR(64) NOT NULL,
    problema_assumido TEXT NOT NULL,
    resultado_pretendido TEXT NOT NULL,
    escopo_assumido TEXT NOT NULL,
    fora_de_escopo TEXT NOT NULL,
    criterio_de_atendimento TEXT NOT NULL,
    restricoes_a_preservar TEXT NOT NULL,
    contexto_relevante TEXT NOT NULL,
    decisao_id VARCHAR(64) NOT NULL,
    usuario_aprovador VARCHAR(128) NOT NULL,
    consolidado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_compromissos PRIMARY KEY (id),
    CONSTRAINT uq_compromissos_necessidade UNIQUE (necessidade_id),
    CONSTRAINT fk_compromissos_necessidade FOREIGN KEY (necessidade_id) REFERENCES necessidade(id) ON DELETE RESTRICT,
    CONSTRAINT fk_compromissos_decisao FOREIGN KEY (decisao_id) REFERENCES decisoes_owner(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_compromissos_necessidade_id ON compromissos(necessidade_id);

