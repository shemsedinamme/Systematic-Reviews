// task.model.js
class Task {
    constructor({
        task_id,
        stage_id,
        task_name,
        assigned_user_id,
        due_date,
    } = {}) {
        this.task_id = task_id || null;
        this.stage_id = stage_id || null;
         this.task_name = task_name || null;
        this.assigned_user_id = assigned_user_id || null;
        this.due_date = due_date || null;
    }
     toJSON() {
        return {
         task_id: this.task_id,
          stage_id: this.stage_id,
           task_name: this.task_name,
         assigned_user_id: this.assigned_user_id,
           due_date: this.due_date
        };
      }
}

module.exports = Task;