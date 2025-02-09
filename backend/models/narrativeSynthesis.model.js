CREATE TABLE IF NOT EXISTS narrative_synthesis_results (
             narrative_id VARCHAR(36) PRIMARY KEY,
            synthesis_id VARCHAR(36) NOT NULL,
            narrative_summary TEXT,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
        );