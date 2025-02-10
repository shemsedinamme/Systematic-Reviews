// article.model.js
class Article {
  constructor({
    article_id,
    database_id,
    title,
    authors,
    abstract,
    publication_date,
    doi,
    pmid,
    pmcid,
    additional_fields
  } = {}) {
    this.article_id = article_id || null;
    this.database_id = database_id || null;
    this.title = title || null;
    this.authors = authors || null;
    this.abstract = abstract || null;
    this.publication_date = publication_date || null;
    this.doi = doi || null;
    this.pmid = pmid || null;
    this.pmcid = pmcid || null;
    this.additional_fields = additional_fields || null;
  }
  toJSON() {
    return {
      article_id: this.article_id,
      database_id: this.database_id,
      title: this.title,
      authors: this.authors,
      abstract: this.abstract,
      publication_date: this.publication_date,
      doi: this.doi,
      pmid: this.pmid,
      pmcid: this.pmcid,
      additional_fields: this.additional_fields,
    };
  }
}
module.exports = Article;