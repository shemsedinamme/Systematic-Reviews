CREATE TABLE IF NOT EXISTS data_synthesis_results (
    synthesis_id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    synthesis_type ENUM('meta-analysis', 'narrative', 'qualitative', 'network-meta-analysis') NOT NULL,
    synthesis_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);