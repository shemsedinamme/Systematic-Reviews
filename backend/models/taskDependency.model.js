// taskDependency.model.js
class TaskDependency {
    constructor({
        dependency_id,
        task_id,
    } = {}) {
        this.dependency_id = dependency_id || null;
        this.task_id = task_id || null;
    }
       toJSON() {
        return {
            dependency_id: this.dependency_id,
            task_id: this.task_id
        };
      }
}

module.exports = TaskDependency;