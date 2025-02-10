const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  //ssl: { //if you are using SSL connection you will have to uncomment this section and provide the appropriate certificates.
  //rejectUnauthorized: true,
  //}
});

class Database {
  constructor(pool) {
    this.pool = pool;
  }

  async executeQuery(query, params) {
    try {
      const [results] = await this.pool.query(query, params);
      return results;
    } catch (error) {
      console.error('Database query error', error);
      throw new Error(`Database error, please check server logs ${error.message}`);
    }
  }

  async insertRecord(table, data, requiredKeys) {
    if (!data) throw new Error("Insertion body cannot be null or undefined");
    const columns = Object.keys(data);
    const valuesPlaceholders = columns.map(() => "?").join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES(${valuesPlaceholders})`;
    const insert_value = columns.map((key) => data[key] || null);

    try {
      const insertRes = await this.executeQuery(query, insert_value);

      if (!insertRes) {
        throw new Error('Failed to insert record. please provide with required keys as provided');
      }
      return insertRes
    } catch (e) {
      console.error("failed insertion error", e);
      throw e;
    }
  }

  async updateRecord(table, data, id, id_column, requiredKeys) {
    const updates = Object.keys(data)
      .filter(key => data[key] !== undefined)
      .map(key => `${key} = ?`).join(',');
    const update_values = Object.values(data).filter(value => value !== undefined);

    if (!id || !id_column) {
      throw new Error('Id field is missing while updating');
    }

    if (updates.length === 0 || Object.keys(data).length === 0) return null;
    try {

      const updateQuery = `UPDATE ${table} SET ${updates} WHERE ${id_column} = ? `;
      const queryValue = [...update_values, id];
      return await this.executeQuery(updateQuery, queryValue);

    } catch (e) {
      console.error(" update failed", e)
      throw e;
    }

  }

  async getRecordById(table, id, id_column, dataModel) {
    if (!id || !id_column) throw new Error("Id parameter is missing on data fetching for an id ")

    const fetchQuery = `SELECT * FROM ${table} WHERE ${id_column} = ? `;
    try {
      const [item] = await this.executeQuery(fetchQuery, [id])

      if (!item) return null; // no result (not-found case ) , we would manage the result at main API (by catching an exception using standard catch function ) to re map ( throw null or status of 404 with no user etc

      // console.log(" item mapped by objec t data:", item[0], typeof  dataModel);
      return this.transformData(item[0], dataModel) // transform results

    } catch (e) {
      console.error(" data  query error", e)
      throw new Error(`failed data select by id ${e.message}`);
    }
  }

  // used only at routes module, as this fetch always all rows.  Must add validation along this query or function before execution based on needs from requirements ( such for large queries etc using pagination etc ). for generic select all call on any table
  async getAllRecord(table, dataModel) {

    const getAllquery = `SELECT * FROM ${table}`
    try {

      const rows = await this.executeQuery(getAllquery);

      // transform with multiple record mappings as array from that SQL select queries, with new mapped values from that json based data object using functional interface from that objects mapping of ModelObjects as response from  database results using generic methods in one places.
      return rows.map(item => this.transformData(item, dataModel));

    } catch (error) {
      console.error(error) // internal issues on database levels
      throw new Error(`Data read issue at database levels. Check database for more. ${error.message} `);
    }
  }
  // transform results , as we want json formatted ( for every api call), based specific column names
  transformData(item, Model) {

    if (!item) return null; // no valid input, so returns nothing to return at implementation layer based function call by each function
    if (typeof Model !== 'function') {
      return item;
    } // generic cases  with default

    try {

      const modelObj = new Model()
      Object.keys(item).forEach((key) => modelObj[key] = item[key] || null);
      return modelObj; // create using constructor ( that could format object with properties that needs to map as  json ) object return based on the Model Interface, each models will ensure the correct data format will follow

    } catch (e) {
      console.error('Object transofmation Error:', e); // errors on any model to transform at data set
      return item // data not mapped properly so, returns original db format data instead by rethrowing an exception

    }

  }


  async deleteRecord(table, id, id_column) {

    if (!id || !id_column) throw new Error("Id or Id_column parameters not specified");
    const deleteQuery = `DELETE FROM ${table} WHERE ${id_column} = ?`;
    try {
      const delResults = await this.executeQuery(deleteQuery, [id]);
      if (!delResults) throw new Error(" Delete data Failed due to DB problems ")
      return delResults; // del result details or rows after deletion and sql related implementation response
    } catch (e) {
      console.error('SQL deletion Error:', e);
      throw e // throws delete error

    }

  }


  async queryByRawSql(rawSqlString) {
    try {
      const result = await this.executeQuery(rawSqlString)
      return result; // it will just directly send output in its array structure
    } catch (e) {
      throw e; // any query fails in sql execution level
    }

  }

}

module.exports = new Database(pool);

const createUserTable = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                hashed_password VARCHAR(255) NOT NULL,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role VARCHAR(255) DEFAULT 'reviewer'
                );
        `);
        await connection.release();
        console.log('User table created or already exists.');
    } catch (error) {
        console.error('Error creating user table:', error);
    }
};
  const createRolesTable = async () => {
      try {
          const connection = await pool.getConnection();
          await connection.query(`
              CREATE TABLE IF NOT EXISTS roles (
                  role_id VARCHAR(36) PRIMARY KEY,
                  role_name VARCHAR(255) NOT NULL UNIQUE
                 );
          `);
          await connection.release();
          console.log('Roles table created or already exists.');
      } catch (error) {
          console.error('Error creating roles table:', error);
      }
  };
const createResetTokenTable = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                expiration_timestamp TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
                );
        `);
        await connection.release();
        console.log('password_reset_tokens table created or already exists.');
    } catch (error) {
        console.error('Error creating password_reset_tokens table:', error);
    }
};
const createBlacklistedTokensTable = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS blacklisted_tokens (
                token VARCHAR(255) PRIMARY KEY,
                expiration_timestamp TIMESTAMP NOT NULL
           );
        `);
        await connection.release();
        console.log('Blacklisted tokens table created or already exists.');
    } catch (error) {
        console.error('Error creating blacklisted tokens table:', error);
    }
};
const createProjectsTable = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS projects (
                project_id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_date DATE,
                end_date DATE,
                creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(255) DEFAULT 'active'
                );
        `);
        await connection.release();
        console.log('Projects table created or already exists.');
    } catch (error) {
        console.error('Error creating projects table:', error);
    }
};
const createProjectMetadataTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS metadata_fields (
                field_id VARCHAR(36) PRIMARY KEY,
                field_name VARCHAR(255) NOT NULL UNIQUE
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_metadata (
                meta_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                field_id VARCHAR(36) NOT NULL,
                value TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (field_id) REFERENCES metadata_fields(field_id)
                );
        `);
        await connection.release();
        console.log('Project metadata tables created or already exists.');
    } catch (error) {
        console.error('Error creating project metadata tables:', error);
    }
};
const createProjectWorkflowTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_workflows (
                workflow_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                workflow_name VARCHAR(255) DEFAULT 'default',
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS workflow_stages (
                stage_id VARCHAR(36) PRIMARY KEY,
                workflow_id VARCHAR(36) NOT NULL,
                stage_name VARCHAR(255) NOT NULL,
                FOREIGN KEY (workflow_id) REFERENCES project_workflows(workflow_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                task_id VARCHAR(36) PRIMARY KEY,
                stage_id VARCHAR(36) NOT NULL,
                task_name VARCHAR(255) NOT NULL,
                assigned_user_id VARCHAR(36),
                due_date DATE,
                FOREIGN KEY (stage_id) REFERENCES workflow_stages(stage_id),
                FOREIGN KEY (assigned_user_id) REFERENCES users(user_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS task_dependencies(
                dependency_id VARCHAR(36) PRIMARY KEY,
                task_id VARCHAR(36) NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(task_id)
                );
        `);
        await connection.release();
        console.log('Project workflow tables created or already exists.');
    } catch (error) {
        console.error('Error creating project workflow tables:', error);
    }
};
const createCollaborationTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS documents (
                document_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                content TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
                );
        `);
        await connection.query(`
             CREATE TABLE IF NOT EXISTS document_versions (
                version_id VARCHAR(36) PRIMARY KEY,
                document_id VARCHAR(36) NOT NULL,
                content TEXT,
                version_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents(document_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS comments (
                comment_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS files (
                file_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
                );
        `);
        await connection.release();
        console.log('Project collaboration tables created or already exists.');
    } catch (error) {
        console.error('Error creating project collaboration tables:', error);
    }
};
const createProjectAccessTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_project_relations (
                user_id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NOT NULL,
                role VARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                 PRIMARY KEY (user_id, project_id)
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS project_access (
                 access_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                 access_type VARCHAR(255) DEFAULT 'read-only',
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
           );
        `);
        await connection.release();
        console.log('Project access tables created or already exists.');
    } catch (error) {
        console.error('Error creating project access tables:', error);
    }
};


const createProtocolTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS templates (
                template_id VARCHAR(36) PRIMARY KEY,
                template_name VARCHAR(255) NOT NULL,
                template_description TEXT
                );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS template_sections (
                section_id VARCHAR(36) PRIMARY KEY,
                template_id VARCHAR(36) NOT NULL,
                section_name VARCHAR(255) NOT NULL,
                FOREIGN KEY (template_id) REFERENCES templates(template_id)
                );
        `);
         await connection.query(`
            CREATE TABLE IF NOT EXISTS template_data_fields (
                field_id VARCHAR(36) PRIMARY KEY,
                 section_id VARCHAR(36) NOT NULL,
                field_name VARCHAR(255) NOT NULL,
                FOREIGN KEY (section_id) REFERENCES template_sections(section_id)
            );
        `);
         await connection.query(`
            CREATE TABLE IF NOT EXISTS protocols (
                 protocol_id VARCHAR(36) PRIMARY KEY,
                 template_id VARCHAR(36) NOT NULL,
                 project_id VARCHAR(36) NOT NULL,
                 title VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (template_id) REFERENCES templates(template_id),
                 FOREIGN KEY (project_id) REFERENCES projects(project_id)
            );
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS protocol_sections (
                section_id VARCHAR(36) PRIMARY KEY,
                 protocol_id VARCHAR(36) NOT NULL,
                 section_name VARCHAR(255) NOT NULL,
                content TEXT,
                FOREIGN KEY (protocol_id) REFERENCES protocols(protocol_id)
                );
        `);
       await connection.query(`
            CREATE TABLE IF NOT EXISTS protocol_reviews (
                 review_id VARCHAR(36) PRIMARY KEY,
                protocol_id VARCHAR(36) NOT NULL,
                section_id VARCHAR(36) NOT NULL,
                 reviewer_id VARCHAR(36) NOT NULL,
                 comment TEXT,
                FOREIGN KEY (protocol_id) REFERENCES protocols(protocol_id),
                FOREIGN KEY (section_id) REFERENCES protocol_sections(section_id),
                 FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
            );
        `);
         await connection.query(`
            CREATE TABLE IF NOT EXISTS protocol_approvals (
                 approval_id VARCHAR(36) PRIMARY KEY,
                 protocol_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                approval_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               FOREIGN KEY (protocol_id) REFERENCES protocols(protocol_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
           );
        `);
        await connection.release();
        console.log('Protocol tables created or already exists.');
    } catch (error) {
        console.error('Error creating protocol tables:', error);
    }
};
const createSearchQueryTables = async () => {
    try {
        const connection = await pool.getConnection();
      await connection.query(`
        CREATE TABLE IF NOT EXISTS articles (
            article_id VARCHAR(36) PRIMARY KEY,
            database_id VARCHAR(255) NOT NULL,
            title TEXT,
            authors TEXT,
            abstract TEXT,
            publication_date DATE,
            doi VARCHAR(255),
            pmid VARCHAR(255),
            pmcid VARCHAR(255),
             additional_fields JSON
          );
      `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS search_queries (
                query_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                 database VARCHAR(255),
                 full_query TEXT,
                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
        `);
        await connection.query(`
             CREATE TABLE IF NOT EXISTS data_quality_issues (
              issue_id VARCHAR(36) PRIMARY KEY,
                 article_id VARCHAR(36) NOT NULL,
                 issue_type VARCHAR(255) NOT NULL,
                issue_description TEXT,
               FOREIGN KEY (article_id) REFERENCES articles(article_id)
                );
       `);
        await connection.query(`
              CREATE TABLE IF NOT EXISTS search_term_mappings (
                mapping_id VARCHAR(36) PRIMARY KEY,
                user_term VARCHAR(255) NOT NULL,
                standard_term VARCHAR(255) NOT NULL,
                database_id VARCHAR(255)
            );
       `);
      await connection.release();
      console.log('Search query tables created or already exists.');
  } catch (error) {
    console.error('Error creating search query tables:', error);
  }
};
const createShareLinksTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS share_links (
                 share_link_id VARCHAR(36) PRIMARY KEY,
                 project_id VARCHAR(36) NOT NULL,
                 password VARCHAR(255),
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
           );
        `);
        await connection.release();
        console.log('Share link tables created or already exists.');
    } catch (error) {
        console.error('Error creating share link tables:', error);
    }
};

 const createscreening_decisionsTables = async () => {
    try {
            const connection = await pool.getConnection();
            await connection.query(`
            CREATE TABLE IF NOT EXISTS screening_decisions (
                decision_id VARCHAR(36) PRIMARY KEY,
                article_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                decision ENUM('include', 'exclude', 'postpone') NOT NULL,
                reason_for_exclusion TEXT,
                screening_stage ENUM('title/abstract', 'full-text') NOT NULL,
                decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                 FOREIGN KEY (article_id) REFERENCES articles(article_id),
                 FOREIGN KEY (user_id) REFERENCES users(user_id)
            );
        `);
            await connection.release();
            console.log('screening_decisions table created or already exists.');
        } catch (error) {
            console.error('Error creating screening_decisions table:', error);
        }
    };
  const createscreening_workflowTables = async () => {
    try {
      const connection = await pool.getConnection();
      await connection.query(`
            CREATE TABLE IF NOT EXISTS screening_workflow (
              workflow_id VARCHAR(36) PRIMARY KEY,
              project_id VARCHAR(36) NOT NULL,
              stage_name VARCHAR(255) NOT NULL,
              FOREIGN KEY (project_id) REFERENCES projects(project_id)
            );
        `);
      await connection.release();
      console.log('screening_workflow table created or already exists.');
    } catch (error) {
      console.error('Error creating screening_workflow table:', error);
    }
  };
   const createscreening_assignments = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
              CREATE TABLE IF NOT EXISTS screening_assignments (
                  assignment_id VARCHAR(36) PRIMARY KEY,
                  workflow_id VARCHAR(36) NOT NULL,
                  reviewer_id VARCHAR(36) NOT NULL,
                   task_id VARCHAR(36) NOT NULL,
                   FOREIGN KEY (workflow_id) REFERENCES screening_workflow(workflow_id),
                  FOREIGN KEY (reviewer_id) REFERENCES users(user_id),
                  FOREIGN KEY (task_id) REFERENCES tasks(task_id)
                );
            `);
            await connection.release();
            console.log('screening_assignments table created or already exists.');
        } catch (error) {
            console.error('Error creating screening_assignments table:', error);
        }
    };
  const createinclusion_criteriaTables = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
              CREATE TABLE IF NOT EXISTS inclusion_criteria (
                criterion_id VARCHAR(36) PRIMARY KEY,
                 project_id VARCHAR(36) NOT NULL,
                  criterion TEXT NOT NULL,
                   type ENUM('inclusion', 'exclusion'),
                 FOREIGN KEY (project_id) REFERENCES projects(project_id)
             );
        `);
        await connection.release();
            console.log('inclusion_criteria table created or already exists.');
        } catch (error) {
            console.error('Error creating inclusion_criteria table:', error);
        }
    };
    const createexclusion_criteriaTables = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
              CREATE TABLE IF NOT EXISTS exclusion_criteria (
                 criterion_id VARCHAR(36) PRIMARY KEY,
                  project_id VARCHAR(36) NOT NULL,
                  criterion TEXT NOT NULL,
                   type ENUM('inclusion', 'exclusion'),
                   FOREIGN KEY (project_id) REFERENCES projects(project_id)
            );
        `);
        await connection.release();
            console.log('exclusion_criteria table created or already exists.');
        } catch (error) {
            console.error('Error creating exclusion_criteria table:', error);
        }
    };
    const createinter_rater_reliabilityTables = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
                 CREATE TABLE IF NOT EXISTS inter_rater_reliability (
                   inter_rater_id VARCHAR(36) PRIMARY KEY,
                  project_id VARCHAR(36) NOT NULL,
                   cohens_kappa DECIMAL(10, 2),
                    fleiss_kappa DECIMAL(10, 2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (project_id) REFERENCES projects(project_id)
                );
             `);
            await connection.release();
            console.log('inter_rater_reliability table created or already exists.');
        } catch (error) {
            console.error('Error creating inter_rater_reliability table:', error);
        }
    };
  const createextraction_formsTables = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
                CREATE TABLE IF NOT EXISTS extraction_forms (
                     form_id VARCHAR(36) PRIMARY KEY,
                     project_id VARCHAR(36) NOT NULL,
                    form_name VARCHAR(255) NOT NULL,
                    form_description TEXT,
                    form_fields JSON,
                    FOREIGN KEY (project_id) REFERENCES projects(project_id)
                );
            `);
            await connection.release();
            console.log('extraction_forms table created or already exists.');
        } catch (error) {
            console.error('Error creating extraction_forms table:', error);
        }
    };
const createform_fieldsTables = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
        CREATE TABLE IF NOT EXISTS form_fields (
            field_id VARCHAR(36) PRIMARY KEY,
             form_id VARCHAR(36) NOT NULL,
              field_type VARCHAR(255) NOT NULL,
              field_label VARCHAR(255) NOT NULL,
              field_options JSON,
             conditional_logic TEXT,
               field_order INT,
            FOREIGN KEY (form_id) REFERENCES extraction_forms(form_id)
        );
        `);
      await connection.release();
        console.log('form_fields table created or already exists.');
    } catch (error) {
        console.error('Error creating form_fields table:', error);
    }
};
 const createform_templatesTables = async () => {
        try {
            const connection = await pool.getConnection();
            await connection.query(`
                CREATE TABLE IF NOT EXISTS form_templates (
                  template_id VARCHAR(36) PRIMARY KEY,
                   template_name VARCHAR(255) NOT NULL,
                  template_description TEXT,
                    template_fields JSON
                );
           `);
            await connection.release();
            console.log('form_templates table created or already exists.');
        } catch (error) {
            console.error('Error creating form_templates table:', error);
        }
    };

// Quality Assessment Tables
const createQualityAssessmentTables = async () => {
    try {
        const connection = await pool.getConnection();
        // quality_assessment_criteria table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quality_assessment_criteria (
                criterion_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                criterion_name VARCHAR(255) NOT NULL,
                criterion_description TEXT,
                criterion_type ENUM('bias', 'quality') NOT NULL,
                criteria_options JSON,
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
            );
        `);
        // quality_assessment_ratings table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quality_assessment_ratings (
                rating_id VARCHAR(36) PRIMARY KEY,
                article_id VARCHAR(36) NOT NULL,
                criterion_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                rating VARCHAR(255),
                rationale TEXT,
                rating_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (article_id) REFERENCES articles(article_id),
                FOREIGN KEY (criterion_id) REFERENCES quality_assessment_criteria(criterion_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
             );
        `);
         // bias_summary_scores table
         await connection.query(`
            CREATE TABLE IF NOT EXISTS bias_summary_scores (
                score_id VARCHAR(36) PRIMARY KEY,
                article_id VARCHAR(36) NOT NULL,
                overall_risk ENUM('Low','High','Unclear'),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                 FOREIGN KEY (article_id) REFERENCES articles(article_id)
            );
         `);
        await connection.release();
        console.log('Quality assessment tables created or already exists.');
    } catch (error) {
        console.error('Error creating quality assessment tables:', error);
    }
};
// Data Synthesis Tables
const createDataSynthesisTables = async () => {
    try {
        const connection = await pool.getConnection();
        // data_synthesis_results table
        await connection.query(`
        CREATE TABLE IF NOT EXISTS data_synthesis_results (
            synthesis_id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36) NOT NULL,
            synthesis_type ENUM('meta-analysis', 'narrative', 'qualitative', 'network-meta-analysis') NOT NULL,
            synthesis_description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(project_id)
        );
    `);
     // meta_analysis_results table
    await connection.query(`
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
`);
  // qualitative_synthesis_results table
    await connection.query(`
        CREATE TABLE IF NOT EXISTS qualitative_synthesis_results (
            qualitative_id VARCHAR(36) PRIMARY KEY,
             synthesis_id VARCHAR(36) NOT NULL,
            coding_scheme JSON,
            meta_aggregation_results JSON,
            thematic_analysis_results JSON,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
        );
    `);
      // narrative_synthesis_results table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS narrative_synthesis_results (
             narrative_id VARCHAR(36) PRIMARY KEY,
            synthesis_id VARCHAR(36) NOT NULL,
            narrative_summary TEXT,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
        );
      `);
      // network_meta_analysis_results table
      await connection.query(`
            CREATE TABLE IF NOT EXISTS network_meta_analysis_results (
                network_id VARCHAR(36) PRIMARY KEY,
                 synthesis_id VARCHAR(36) NOT NULL,
                comparison_matrix JSON,
                 network_plot_data JSON,
                 FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );
        `);                   
       // publication_bias_assessment table
      await connection.query(`
         CREATE TABLE IF NOT EXISTS publication_bias_assessment (
                bias_id VARCHAR(36) PRIMARY KEY,
                 synthesis_id VARCHAR(36) NOT NULL,
                funnel_plot_data JSON,
                eggers_test_p DECIMAL(5,4),
                trim_and_fill_data JSON,
                FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );
     `);
     // sensitivity_analysis_results table
    await connection.query(`
         CREATE TABLE IF NOT EXISTS sensitivity_analysis_results (
             sensitivity_id VARCHAR(36) PRIMARY KEY,
            synthesis_id VARCHAR(36) NOT NULL,
             analysis_type VARCHAR(255),
            analysis_description TEXT,
            analysis_results JSON,
            FOREIGN KEY (synthesis_id) REFERENCES data_synthesis_results(synthesis_id)
            );
        `);
        await connection.release();
        console.log('Data synthesis tables created or already exists.');
    } catch (error) {
        console.error('Error creating data synthesis tables:', error);
    }
};

const createGenericTables = async (query, tableName) => {
    try {
        const connection = await pool.getConnection();
         await connection.query(query);
        await connection.release();
        console.log(`${tableName} table created or already exists.`);
    } catch (error) {
        console.error(`Error creating ${tableName} table:`, error);
    }
}
// Function to create the report_templates table
const createReportTemplatesTable = async () => {
   const query = `
        CREATE TABLE IF NOT EXISTS report_templates (
            template_id VARCHAR(36) PRIMARY KEY,
                        template_name VARCHAR(255) NOT NULL,
            template_type VARCHAR(50),
            template_structure JSON NOT NULL
        );
    `;
    return createGenericTables(query, 'Report templates');
};

// Function to create the report_metadata table
const createReportMetadataTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS report_metadata (
            report_id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36) NOT NULL,
            template_id VARCHAR(36) NOT NULL,
            metadata JSON NOT NULL,
            FOREIGN KEY (template_id) REFERENCES report_templates(template_id)
        );
    `;
    return createGenericTables(query, 'Report metadata');
};
 const createManuscriptTemplatesTable = async () => {
  const query =  `
      CREATE TABLE IF NOT EXISTS manuscript_templates (
            template_id VARCHAR(36) PRIMARY KEY,
            template_name VARCHAR(255) NOT NULL,
            template_structure JSON NOT NULL
         );
     `;
       return createGenericTables(query, 'Manuscript templates');
    };
const createManuscriptsTable = async () => {
        const query = `
            CREATE TABLE IF NOT EXISTS manuscripts (
                manuscript_id VARCHAR(36) PRIMARY KEY,
                project_id VARCHAR(36) NOT NULL,
                template_id VARCHAR(36) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                 FOREIGN KEY (template_id) REFERENCES manuscript_templates(template_id)
           );
        `;
      return createGenericTables(query, 'Manuscripts');
   };

// Function to initialize the database
const initializeDatabase = async () => {
    await createUserTable();
    await createRolesTable();
    await createResetTokenTable();
    await createBlacklistedTokensTable();
    await createProjectsTable();
    await createProjectMetadataTables();
    await createProjectWorkflowTables();
    await createCollaborationTables();
    await createProjectAccessTables();
    await createProtocolTables();
    await createSearchQueryTables();
    await createShareLinksTables();
    await createscreening_decisionsTables();
    await createscreening_workflowTables();
    await createscreening_assignments();
    await createinclusion_criteriaTables();
    await createexclusion_criteriaTables();
    await createinter_rater_reliabilityTables();
    await createextraction_formsTables();
    await createform_fieldsTables();
    await createform_templatesTables();
    await createQualityAssessmentTables();
    await createDataSynthesisTables();
    await createReportTemplatesTable();
    await createReportMetadataTable();
      await createManuscriptTemplatesTable();
      await createManuscriptsTable();
};

// Run the database initialization
initializeDatabase()
    .then(() => {
        console.log("Database initialization completed successfully.");
        //pool.end(); // removed the pool close here, since we need to keep it running for web apps
    })
    .catch((error) => {
        console.error("Database initialization failed:", error);
    });
    
    module.exports = pool;
            
