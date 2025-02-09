CREATE TABLE IF NOT EXISTS qualitative_synthesis_results (
            qualitative_id VARCHAR(36) PRIMARY KEY,
             synthesis_id VARCHAR(36) NOT NULL,
            coding_scheme JSON,
            meta_aggregation_results JSON,
            thematic_analysis_results JSON,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
        );