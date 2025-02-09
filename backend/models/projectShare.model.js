// projectShare.model.js
class ProjectShare {
    constructor({
        share_link_id,
        project_id,
        password
    } = {}) {
        this.share_link_id = share_link_id || null;
         this.project_id = project_id || null;
        this.password = password || null;
    }
       toJSON() {
           return {
             share_link_id: this.share_link_id,
            project_id: this.project_id,
             password: this.password
        }
       }
}
module.exports = ProjectShare;