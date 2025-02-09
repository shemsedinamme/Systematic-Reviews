// workflow.model.js
class Workflow {
    constructor({
        workflow_id,
        project_id,
         workflow_name
    } = {}) {
        this.workflow_id = workflow_id || null;
        this.project_id = project_id || null;
        this.workflow_name = workflow_name || null;
    }
      toJSON() {
        return {
          workflow_id: this.workflow_id,
          workflow_name: this.workflow_name,
         project_id: this.project_id
        };
      }
}
module.exports = Workflow;