// projectDocument.model.js
class ProjectDocument {
    constructor({
        document_id,
        project_id,
        content,
    } = {}) {
        this.document_id = document_id || null;
        this.project_id = project_id || null;
        this.content = content || null;
    }
       toJSON() {
        return {
             document_id: this.document_id,
             content: this.content
        }
    }
}
module.exports = ProjectDocument;