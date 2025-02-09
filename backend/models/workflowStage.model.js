// workflowStage.model.js
class WorkflowStage {
    constructor({
        stage_id,
        workflow_id,
        stage_name
    } = {}) {
        this.stage_id = stage_id || null;
       this.workflow_id = workflow_id || null;
        this.stage_name = stage_name || null;
    }
     toJSON() {
        return {
          stage_id: this.stage_id,
           workflow_id: this.workflow_id,
          stage_name: this.stage_name
        };
      }
}
module.exports = WorkflowStage;