// projectMetadata.model.js
class ProjectMetadata {
    constructor({
        meta_id,
        field_name,
        value
    } = {}) {
        this.meta_id = meta_id || null;
        this.field_name = field_name || null;
        this.value = value || null;
    }
    toJSON() {
      return {
        meta_id: this.meta_id,
        field_name: this.field_name,
        value: this.value,
      };
    }
}

module.exports = ProjectMetadata;