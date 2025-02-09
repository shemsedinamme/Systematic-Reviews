CREATE TABLE IF NOT EXISTS publication_bias_assessment (
                bias_id VARCHAR(36) PRIMARY KEY,
                 synthesis_id VARCHAR(36) NOT NULL,
                funnel_plot_data JSON,
                eggers_test_p DECIMAL(5,4),
                trim_and_fill_data JSON,
                FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );