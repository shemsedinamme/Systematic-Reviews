// searchQuery.model.js
class SearchQuery {
  constructor({
    query_id,
    user_id,
    database,
    full_query,
    created_at,
  } = {}) {
    this.query_id = query_id || null;
    this.user_id = user_id || null;
    this.database = database || null;
    this.full_query = full_query || null;
    this.created_at = created_at || null;
  }
  toJSON() {
    return {
      query_id: this.query_id,
      user_id: this.user_id,
      database: this.database,
      full_query: this.full_query,
      created_at: this.created_at,
    };
  }
}

module.exports = SearchQuery;