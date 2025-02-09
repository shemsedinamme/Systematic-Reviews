// project.model.js
class Project {
    constructor({
        project_id,
        title,
        description,
        start_date,
        end_date,
        creation_date,
        status
    } = {}) {
        this.project_id = project_id || null;
        this.title = title || null;
        this.description = description || null;
        this.start_date = start_date || null;
        this.end_date = end_date || null;
        this.creation_date = creation_date || null;
        this.status = status || 'active'; // Default status is active
    }
    toJSON() {
        return {
            project_id: this.project_id,
            title: this.title,
            description: this.description,
            start_date: this.start_date,
            end_date: this.end_date,
             creation_date: this.creation_date,
             status: this.status
        };
    }
}
module.exports = Project;