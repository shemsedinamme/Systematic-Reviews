CREATE TABLE IF NOT EXISTS sensitivity_analysis_results (
             sensitivity_id VARCHAR(36) PRIMARY KEY,
            synthesis_id VARCHAR(36) NOT NULL,
             analysis_type VARCHAR(255),
            analysis_description TEXT,
            analysis_results JSON,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );