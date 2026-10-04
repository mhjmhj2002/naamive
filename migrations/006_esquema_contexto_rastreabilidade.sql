-- Migração 006: Esquema Relacional de Contexto, Proveniência e Rastreabilidade (M-004 / EV-004)
-- Suporte a PostgreSQL ANSI e emulação via pg-mem com restrições explícitas de integridade.
-- Preservação estruturada de proveniência com classificação epistêmica, dados em JSONB,
-- distinção entre estado vigente e histórico superado e vínculos causais direcionados.

CREATE TABLE IF NOT EXISTS registros_proveniencia (
    id VARCHAR(64) NOT NULL,
    entidade_tipo VARCHAR(50) NOT NULL,
    entidade_id VARCHAR(64) NOT NULL,
    codigo_referencia VARCHAR(50) NOT NULL,
    tipo_registro VARCHAR(50) NOT NULL,
    autor_responsavel VARCHAR(100) NOT NULL,
    classificacao_epistemica VARCHAR(30) NOT NULL,
    dados_contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
    vigente BOOLEAN NOT NULL DEFAULT TRUE,
    registrado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_registros_proveniencia PRIMARY KEY (id),
    CONSTRAINT chk_entidade_tipo CHECK (
        entidade_tipo IN (
            'NECESSIDADE',
            'PROJETO',
            'MODULO',
            'ENTREGA_DE_VALOR',
            'ITEM_DE_TRABALHO',
            'GOVERNANCA'
        )
    ),
    CONSTRAINT chk_tipo_registro CHECK (
        tipo_registro IN (
            'EVIDENCIA',
            'DECISAO_HUMANA',
            'RESULTADO_PROCESSO',
            'TRANSICAO_STATUS',
            'VINCULO_CAUSAL',
            'HANDOFF'
        )
    ),
    CONSTRAINT chk_classificacao_epistemica CHECK (
        classificacao_epistemica IN (
            'CONHECIDO',
            'INFERIDO',
            'PROPOSTO',
            'DESCONHECIDO'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_prov_entidade_cod ON registros_proveniencia(entidade_tipo, codigo_referencia);
CREATE INDEX IF NOT EXISTS idx_prov_tipo ON registros_proveniencia(tipo_registro);
CREATE INDEX IF NOT EXISTS idx_prov_vigente ON registros_proveniencia(vigente);
CREATE INDEX IF NOT EXISTS idx_prov_entidade_id ON registros_proveniencia(entidade_id);

-- Vínculos Causais Direcionados (Grafo relacional de ascendência, sustentação e derivação)
CREATE TABLE IF NOT EXISTS vinculos_causais (
    id VARCHAR(64) NOT NULL,
    origem_registro_id VARCHAR(64) NOT NULL,
    destino_registro_id VARCHAR(64) NOT NULL,
    tipo_relacao VARCHAR(50) NOT NULL,
    justificativa TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT pk_vinculos_causais PRIMARY KEY (id),
    CONSTRAINT fk_vinculo_origem FOREIGN KEY (origem_registro_id) REFERENCES registros_proveniencia(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vinculo_destino FOREIGN KEY (destino_registro_id) REFERENCES registros_proveniencia(id) ON DELETE RESTRICT,
    CONSTRAINT uq_vinculo_direcionado UNIQUE (origem_registro_id, destino_registro_id, tipo_relacao),
    CONSTRAINT chk_tipo_relacao CHECK (
        tipo_relacao IN (
            'ORIGINADO_DE',
            'HABILITADO_POR',
            'SUSTENTADO_POR',
            'SUBSTITUI',
            'DEPENDE_DE'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_vinc_origem ON vinculos_causais(origem_registro_id);
CREATE INDEX IF NOT EXISTS idx_vinc_destino ON vinculos_causais(destino_registro_id);
