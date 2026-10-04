-- Migração 005: Esquema Relacional de Coordenação do Trabalho, Handoffs e Retornos (M-003)
-- Suporte a PostgreSQL ANSI e pg-mem com restrições explícitas de integridade.
-- Invariante nuclear de especialização: cada trabalho preparado define competência requerida, Ator e Skill.
-- Condições operacionais suportadas: POSSIVEL, PREPARADO, EM_EXECUCAO, BLOQUEADO, AGUARDANDO_DECISAO_HUMANA, ENCERRADO.

CREATE TABLE IF NOT EXISTS trabalhos_coordenados (
    id VARCHAR(64) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    projeto_id VARCHAR(64) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    objetivo TEXT NOT NULL,
    condicao_operacional VARCHAR(50) NOT NULL,
    competencia_requerida VARCHAR(100) NOT NULL,
    ator_requerido VARCHAR(100) NOT NULL,
    skill_requerida VARCHAR(255),
    executor_designado VARCHAR(100),
    criterio_termino TEXT NOT NULL,
    dependencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    motivo_bloqueio TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_trabalhos_coordenados PRIMARY KEY (id),
    CONSTRAINT uq_trabalhos_coordenados_codigo UNIQUE (codigo),
    CONSTRAINT fk_trabalhos_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE RESTRICT,
    CONSTRAINT chk_condicao_operacional CHECK (
        condicao_operacional IN (
            'POSSIVEL',
            'PREPARADO',
            'EM_EXECUCAO',
            'BLOQUEADO',
            'AGUARDANDO_DECISAO_HUMANA',
            'ENCERRADO'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_trabalhos_projeto_id ON trabalhos_coordenados(projeto_id);
CREATE INDEX IF NOT EXISTS idx_trabalhos_condicao_operacional ON trabalhos_coordenados(condicao_operacional);
CREATE INDEX IF NOT EXISTS idx_trabalhos_codigo ON trabalhos_coordenados(codigo);

-- Handoffs de Coordenação (Pacotes despachados com rastreabilidade estruturada e token único)
CREATE TABLE IF NOT EXISTS handoffs_coordenacao (
    id VARCHAR(64) NOT NULL,
    trabalho_id VARCHAR(64) NOT NULL,
    token_correlacao VARCHAR(100) NOT NULL,
    ator_destinatario VARCHAR(100) NOT NULL,
    skill_destinataria VARCHAR(255),
    conteudo_handoff JSONB NOT NULL,
    despachado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_handoffs_coordenacao PRIMARY KEY (id),
    CONSTRAINT uq_handoffs_token_correlacao UNIQUE (token_correlacao),
    CONSTRAINT fk_handoffs_trabalho FOREIGN KEY (trabalho_id) REFERENCES trabalhos_coordenados(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_handoffs_trabalho_id ON handoffs_coordenacao(trabalho_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_token_correlacao ON handoffs_coordenacao(token_correlacao);

-- Retornos de Coordenação (Registro imutável dos resultados da execução do handoff)
CREATE TABLE IF NOT EXISTS retornos_coordenacao (
    id VARCHAR(64) NOT NULL,
    handoff_id VARCHAR(64) NOT NULL,
    sucesso BOOLEAN NOT NULL,
    resultado_observavel TEXT NOT NULL,
    pendencias_ou_bloqueios TEXT,
    recebido_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_retornos_coordenacao PRIMARY KEY (id),
    CONSTRAINT fk_retornos_handoff FOREIGN KEY (handoff_id) REFERENCES handoffs_coordenacao(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_retornos_handoff_id ON retornos_coordenacao(handoff_id);
