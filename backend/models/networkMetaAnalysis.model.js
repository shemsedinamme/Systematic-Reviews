 CREATE TABLE IF NOT EXISTS network_meta_analysis_results (
                network_id VARCHAR(36) PRIMARY KEY,
                 synthesis_id VARCHAR(36) NOT NULL,
                comparison_matrix JSON,
                 network_plot_data JSON,
                 FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );