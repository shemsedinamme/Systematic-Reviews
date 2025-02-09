CREATE TABLE IF NOT EXISTS meta_analysis_results (
    meta_id VARCHAR(36) PRIMARY KEY,
    synthesis_id VARCHAR(36) NOT NULL,
    outcome VARCHAR(255) NOT NULL,
    model_type ENUM('fixed-effect', 'random-effects') NOT NULL,
    pooled_estimate DECIMAL(10, 4),
    heterogeneity_i2 DECIMAL(5, 2),
    forest_plot_data JSON,
    subgroup_analysis_data JSON,
    FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
);