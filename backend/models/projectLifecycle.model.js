// projectLifecycle.model.js
class ProjectLifecycle {
    constructor({
        project_id,
        status,
    } = {}) {
        this.project_id = project_id || null;
        this.status = status || null;
    }
     toJSON() {
        return {
             project_id: this.project_id,
             state: this.status
        }
     }
}
module.exports = ProjectLifecycle;