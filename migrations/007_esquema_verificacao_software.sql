-- Migração 007: Esquema Relacional de Verificação do Resultado de Software (M-005 / EV-005)
-- Suporte a PostgreSQL ANSI e emulação via pg-mem com restrições explícitas de integridade.
-- Contempla resultados_software, criterios_verificaveis, evidencias_verificacao e laudos_verificacao.
-- Invariante nuclear de explicabilidade e não presunção: integridade referencial estrita, constraints CHECK
-- para conclusões e métodos de observação, e suporte a dados estruturados em JSONB.

-- 1. Resultados de Software disponibilizados
CREATE TABLE IF NOT EXISTS resultados_software (
    id VARCHAR(64) NOT NULL,
    codigo_referencia VARCHAR(50) NOT NULL,
    modulo_origem VARCHAR(50) NOT NULL,
    entrega_valor_codigo VARCHAR(50) NOT NULL,
    versao_artefato VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    declarado_por VARCHAR(100) NOT NULL,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_resultados_software PRIMARY KEY (id),
    CONSTRAINT uq_res_software_codigo UNIQUE (codigo_referencia)
);

CREATE INDEX IF NOT EXISTS idx_res_software_modulo ON resultados_software(modulo_origem);
CREATE INDEX IF NOT EXISTS idx_res_software_ev ON resultados_software(entrega_valor_codigo);
CREATE INDEX IF NOT EXISTS idx_res_software_codigo ON resultados_software(codigo_referencia);

-- 2. Critérios Verificáveis derivados do compromisso e percurso
CREATE TABLE IF NOT EXISTS criterios_verificaveis (
    id VARCHAR(64) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    resultado_software_id VARCHAR(64) NOT NULL,
    origem_normativa VARCHAR(255) NOT NULL,
    descricao_comportamento TEXT NOT NULL,
    metodo_observacao VARCHAR(50) NOT NULL,
    condicao_satisfacao TEXT NOT NULL,
    limites_ou_tolerancias TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_criterios_verificaveis PRIMARY KEY (id),
    CONSTRAINT uq_criterios_codigo UNIQUE (codigo),
    CONSTRAINT fk_criterios_resultado FOREIGN KEY (resultado_software_id) REFERENCES resultados_software(id) ON DELETE CASCADE,
    CONSTRAINT chk_metodo_observacao CHECK (
        metodo_observacao IN (
            'SUITE_AUTOMATIZADA',
            'INSPECAO_HTTP',
            'CONFORMIDADE_ESQUEMA',
            'OPERACIONAL'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_criterios_resultado_id ON criterios_verificaveis(resultado_software_id);
CREATE INDEX IF NOT EXISTS idx_criterios_codigo ON criterios_verificaveis(codigo);
CREATE INDEX IF NOT EXISTS idx_criterios_metodo ON criterios_verificaveis(metodo_observacao);

-- 3. Evidências de Verificação coletadas
CREATE TABLE IF NOT EXISTS evidencias_verificacao (
    id VARCHAR(64) NOT NULL,
    criterio_id VARCHAR(64) NOT NULL,
    procedimento_executado VARCHAR(255) NOT NULL,
    resultado_observado TEXT NOT NULL,
    dados_detalhados JSONB NOT NULL DEFAULT '{}'::jsonb,
    sucesso BOOLEAN NOT NULL,
    coletado_por VARCHAR(100) NOT NULL,
    coletado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_evidencias_verificacao PRIMARY KEY (id),
    CONSTRAINT fk_evidencias_criterio FOREIGN KEY (criterio_id) REFERENCES criterios_verificaveis(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidencias_criterio_id ON evidencias_verificacao(criterio_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_sucesso ON evidencias_verificacao(sucesso);

-- 4. Laudos Técnicos de Verificação e Conformidade
CREATE TABLE IF NOT EXISTS laudos_verificacao (
    id VARCHAR(64) NOT NULL,
    resultado_software_id VARCHAR(64) NOT NULL,
    criterio_id VARCHAR(64) NOT NULL,
    conclusao VARCHAR(50) NOT NULL,
    fundamentacao_tecnica TEXT NOT NULL,
    evidencias_utilizadas JSONB NOT NULL DEFAULT '[]'::jsonb,
    divergencias_apontadas TEXT,
    emitido_por VARCHAR(100) NOT NULL,
    emitido_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_laudos_verificacao PRIMARY KEY (id),
    CONSTRAINT fk_laudos_resultado FOREIGN KEY (resultado_software_id) REFERENCES resultados_software(id) ON DELETE CASCADE,
    CONSTRAINT fk_laudos_criterio FOREIGN KEY (criterio_id) REFERENCES criterios_verificaveis(id) ON DELETE CASCADE,
    CONSTRAINT uq_laudo_resultado_criterio UNIQUE (resultado_software_id, criterio_id),
    CONSTRAINT chk_conclusao_verificacao CHECK (
        conclusao IN (
            'CRITERIO_DEMONSTRADO',
            'CRITERIO_NAO_DEMONSTRADO',
            'EVIDENCIA_INSUFICIENTE',
            'VERIFICACAO_IMPOSSIVEL',
            'DIVERGENCIA_ENCONTRADA'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_laudo_res_crit ON laudos_verificacao(resultado_software_id, criterio_id);
CREATE INDEX IF NOT EXISTS idx_laudo_conclusao ON laudos_verificacao(conclusao);
