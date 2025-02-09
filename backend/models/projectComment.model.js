// projectComment.model.js
class ProjectComment {
    constructor({
        comment_id,
        project_id,
        user_id,
         text,
         created_at
    } = {}) {
        this.comment_id = comment_id || null;
        this.project_id = project_id || null;
        this.user_id = user_id || null;
        this.text = text || null;
         this.created_at = created_at || null
    }
       toJSON() {
        return {
             comment_id: this.comment_id,
             text: this.text,
            created_at: this.created_at
        }
      }
}
module.exports = ProjectComment;