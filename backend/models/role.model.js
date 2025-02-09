// role.model.js
class Role {
  constructor({
      role_id,
      role_name,
  } = {}) {
      this.role_id = role_id || null;
      this.role_name = role_name || null;
  }
  toJSON() {
    return {
        role_id: this.role_id,
        role_name: this.role_name,
    }
  }
}
module.exports = Role;