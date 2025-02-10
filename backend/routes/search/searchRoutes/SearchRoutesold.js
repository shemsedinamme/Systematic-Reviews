//searchRoutes.js 
const express = require('express');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const pool = require('./database');
const { authorizeRole } = require('./authMiddleware');
const { sanitizeInput } = require('./utils');
const { body, validationResult, query } = require('express-validator');
const axios = require('axios');
const citeproc = require('citeproc-js');
const router = express.Router();

// Database table and column names
const ARTICLES_TABLE = 'articles';
const SEARCH_QUERIES_TABLE = 'search_queries';
const SHARE_LINKS_TABLE = 'share_links';
const TEMPLATES_TABLE = 'templates';
const TEMPLATE_SECTIONS_TABLE = 'template_sections';
const TEMPLATE_DATA_FIELDS_TABLE = 'template_data_fields';
const PROTOCOLS_TABLE = 'protocols';
const PROTOCOL_SECTIONS_TABLE = 'protocol_sections';
const PROTOCOL_REVIEWS_TABLE = 'protocol_reviews';
const PROTOCOL_APPROVALS_TABLE = 'protocol_approvals';
const USERS_TABLE = 'users';

// PubMed API Client (NCBI E-utilities)
const pubmedApi = axios.create({
    baseURL: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
});
const PUBMED_DATABASE_ID = 'PubMed';
// Helper function to fetch data from pubmed
const fetchPubMed = async (query, retmax= 20) => {
    try {
       const response = await pubmedApi.get('/esearch.fcgi', {
           params: {
            db: 'pubmed',
               term: query,
               retmax: retmax,
                retmode: 'json'
           }
        });
          if(response.data.esearchresult.count === '0') return []

        const idList = response.data.esearchresult.idlist.join(',');
       const fetchArticleDetails = await pubmedApi.get('/esummary.fcgi', {
           params: {
                db: 'pubmed',
                id: idList,
               retmode: 'json'
           }
        });
        const records =  Object.values(fetchArticleDetails.data.result).slice(1)
      const formattedData = records.map(record => ({
           article_id: uuidv4(),
           database_id: PUBMED_DATABASE_ID,
            title: record.title,
             authors: record.authors.map(author => `${author.name}`).join(', '),
            abstract: record.abstract,
           publication_date: record.pubdate,
             doi: record.doi,
            pmid: record.uid,
            additional_fields: JSON.stringify(record)
       }))
       return formattedData
    } catch (error) {
        console.error('Error fetching from PubMed:', error);
      throw new Error('Failed to fetch data from PubMed API');
    }
};
// Cache for API responses (move the cache outside the function to make it reusable)
const cache = new Map();
// Unpaywall API client
const unpaywallApi = axios.create({
    baseURL: 'https://api.unpaywall.org/v2/',
});
// Centralized error handling function
const handleAPIError = (res, error, statusCode = 500, message = 'Internal server error') => {
    console.error(error);
    res.status(statusCode).json({ message: message });
};
// Database query helper function
const executeQuery = async (query, params) => {
    try {
        const [results] = await pool.query(query, params);
        return results;
    } catch (error) {
        throw error;
    }
};
/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get articles based on query
 *     description: Get a list of articles based on the provided search query
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         description: search query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Articles retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                    article_id:
 *                      type: string
 *                      description: unique id of the article
 *                    database_id:
 *                      type: string
 *                      description: database id of the article
 *                    title:
 *                      type: string
 *                      description: Title of the article
 *                    authors:
 *                        type: string
 *                        description: Authors of the article
 *                    abstract:
 *                        type: string
 *                        description: Abstract of the article
 *                    publication_date:
 *                       type: string
 *                       description: publication date of the article
 *                    doi:
 *                        type: string
 *                        description: DOI of the article
 *                    pmid:
 *                       type: string
 *                       description: pubmed id of the article
  *                   pmcid:
 *                      type: string
 *                      description: pubmed central id of the article
  *                   additional_fields:
  *                      type: string
  *                      description: additional fields of the article, stored in json
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Search query parameter is required.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to fetch articles'
 */
router.get('/articles',
     [
        query('query').notEmpty().isString().trim().isLength({max:1000}).withMessage('Search query is required, and must be a string not more than 1000 characters.')
    ],
     async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    const { query } = req.query;
    try {
        const pubmedResults = await fetchPubMed(query);
        //Combine the results from different databases into one array and respond.
        const allResults = [
          ...pubmedResults,
            //...scopusResults,
           //...wosResults
          ];
        //save all the results to the database
         await Promise.all(allResults.map(async (result) => {
            const insertArticleQuery = `
                INSERT INTO ${ARTICLES_TABLE} SET ?
            `;
           await executeQuery(insertArticleQuery, result);
        }))
        res.status(200).json(allResults);
    } catch (error) {
        handleAPIError(res, error, 500, `Failed to fetch articles. ${error.message}`);
    }
});
/**
 * @swagger
 * /search/query-builder:
 *   get:
 *     summary: Get saved queries for a user
 *     description: Retrieves the saved queries for a specific user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved queries fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   query_id:
 *                     type: string
 *                     description: unique id for search query
 *                   user_id:
 *                      type: string
 *                      description: unique id for user
 *                   database:
 *                     type: string
 *                     description: datbase used for the search
  *                   search_query:
 *                     type: string
 *                     description: The search query
 *                   created_at:
 *                     type: string
 *                     description: date and time that the search query was created.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to fetch saved queries.'
 */
router.get('/search/query-builder', async (req, res) => {
    try {
         const userId = req.user.user_id;
          if(!uuidValidate(userId)) return handleAPIError(res, null, 400, 'Invalid user id format');

        const query = `SELECT * FROM ${SEARCH_QUERIES_TABLE} WHERE user_id = ?`;
        const queries = await executeQuery(query, [req.user.user_id]);
        res.status(200).json(queries);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to fetch saved queries.');
    }
});

/**
 * @swagger
 * /search/query-builder:
 *   post:
 *     summary: Save a search query
 *     description: Save a generated search query
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search_query:
 *                 type: string
 *                 description: The search query to save.
  *               databases:
 *                 type: array
 *                 description: array of databases used for this query
 *             example:
 *                 search_query: "(title:(covid-19) OR abstract:(covid-19)) AND (author:johnson)"
 *                 databases: ["PubMed"]
 *     responses:
 *       201:
 *         description: Saved queries saved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   query_id:
 *                     type: string
 *                     description: The unique id for the new search query.
 *                   search_query:
 *                      type: string
 *                      description: The search query that was saved
 *                   created_at:
 *                      type: string
 *                      description: The timestamp that it was created.
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Search query is required.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to save search query.'
 */
router.post('/search/query-builder', authenticateToken,
    [
        body('search_query').notEmpty().isString().trim().isLength({max:2000}).withMessage('Search query is required and must be a string not more than 2000 characters.'),
        body('databases').optional().isArray().withMessage('Databases must be array of string.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { search_query, databases } = req.body;
    try {
          const queryId = uuidv4();
          const insertSearchQuery =
            `INSERT INTO ${SEARCH_QUERIES_TABLE} (query_id, user_id, full_query, database) VALUES (?, ?, ?, ?) `;
          await executeQuery(insertSearchQuery,[queryId, req.user.user_id, sanitizeInput(search_query), databases?.join(', ') || null ]);
        const searchQuery = {
           query_id: queryId,
            search_query: search_query,
          created_at: new Date()
        }
         res.status(201).json(searchQuery);
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to save search query.');
    }
});
/**
 * @swagger
 * /search/generate-query:
 *   post:
 *     summary: Generate a search query
 *     description: Generate a search query based on the provided keywords, or PICO elements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keywords:
 *                 type: string
 *                 description: The comma separated list of keywords.
 *               population:
 *                  type: string
 *                  description: Population for PICO query.
 *               intervention:
 *                   type: string
 *                   description: Intervention for PICO query.
 *               comparison:
 *                  type: string
 *                  description: Comparison for PICO query.
 *               outcome:
 *                  type: string
 *                   description: Outcome for PICO query.
 *             example:
 *                  keywords: "covid-19, pandemic, vaccine"
 *                  population: "adults"
 *                  intervention: "remdesivir"
 *                  comparison: "placebo"
 *                  outcome: "mortality"
 *
 *     responses:
 *       200:
 *         description: Search query generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                   description: The generated search query.
 *             example:
 *                query: "covid-19 OR pandemic OR vaccine"
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Keywords or PICO elements are required.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to generate query.'
 */
router.post('/search/generate-query', authenticateToken,
    [
      body('keywords').optional().isString().trim().isLength({max:2000}).withMessage('Keywords must be a string not more than 2000 characters.'),
      body('population').optional().isString().trim().isLength({max:255}).withMessage('Population must be a string not more than 255 characters.'),
        body('intervention').optional().isString().trim().isLength({max:255}).withMessage('Intervention must be a string not more than 255 characters.'),
        body('comparison').optional().isString().trim().isLength({max:255}).withMessage('Comparison must be a string not more than 255 characters.'),
        body('outcome').optional().isString().trim().isLength({max:255}).withMessage('Outcome must be a string not more than 255 characters.')
    ],
     async (req, res) => {
         const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { keywords, population, intervention, comparison, outcome } = req.body;
    if (!keywords && !population && !intervention && !comparison && !outcome) {
        return res.status(400).json({ message: 'Keywords or PICO elements are required.' });
    }
    try {
           if(keywords){
              const keywordArray = keywords.split(',').map(term => term.trim()).filter(Boolean)
              const query = keywordArray.join(' OR ')
               return res.status(200).json({ query: query });
           } else {
                const query = `(${population || ''}) AND (${intervention || ''}) AND (${comparison || ''}) AND (${outcome || ''})`
              return res.status(200).json({ query: query });
           }

    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to generate query.');
    }
});

/**
 * @swagger
 * /search/translate-query:
 *   post:
 *     summary: Translate search query based on the database.
 *     description: Translates search queries for the provided databases.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: The search query to translate
  *               databases:
 *                 type: array
 *                 description: The databases to generate queries
 *             example:
 *                 query: "(title:covid-19 OR abstract:covid-19) AND (author:johnson)"
 *                 databases: ["PubMed", "Scopus"]
 *     responses:
 *       200:
 *         description: Query translated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                  type: string
 *                  description: The databases as keys with values as translated queries.
 *             example:
 *               PubMed: "(title:(covid-19) OR abstract:(covid-19)) AND (author:johnson)"
 *               Scopus: "TITLE(covid-19) OR ABS(covid-19) AND AUTH(johnson)"
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Please provide a query and database to translate'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to translate query.'
 */
router.post('/search/translate-query', authenticateToken,
  [
      body('query').notEmpty().isString().trim().isLength({max:2000}).withMessage('Query is required and must be a string not more than 2000 characters.'),
      body('databases').notEmpty().isArray().withMessage('Databases are required and must be an array.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { query, databases } = req.body;
    if (!query || !databases || databases.length === 0) {
        return res.status(400).json({ message: 'Please provide a query and database to translate' });
    }
    try {
        const translatedQueries = {};
          for(const database of databases) {
                //TODO: Implement the translation logic for each databases
               if(database === 'PubMed') {
                   translatedQueries[database] = query
               }
               else {
                translatedQueries[database] = query; //placeholder
              }
            }
         res.status(200).json(translatedQueries);
    } catch (error) {
       handleAPIError(res, error, 500, 'Failed to translate query.');
    }
});
/**
 * @swagger
 * /search/results/export:
 *   get:
 *     summary: Export search results.
 *     description: Exports the search results in a specified format.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         description: The format in which search results are exported
 *         schema:
 *           type: string
 *           enum: [csv, ris, bibtex]
 *     responses:
 *       200:
 *         description: Search results exported successfully.
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    description: The message returned by the system.
 *             example:
 *                message: 'Export format is required.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to export search results.'
 */
router.get('/search/results/export', authenticateToken,
    [
        query('format').notEmpty().isIn(['csv', 'ris', 'bibtex']).withMessage('Export format is required and must be csv, ris or bibtex.')
    ],
    async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { format } = req.query;
    try {
        const articles = await executeQuery(`SELECT * from ${ARTICLES_TABLE}`);
         let exportedResults = null;
        if(format === 'csv'){
            const header = 'article_id,database_id,title,authors,abstract,publication_date,doi,pmid,pmcid \n'
            const articleRows = articles.map(article =>
                `"${article.article_id}","${article.database_id}", "${article.title.replace('"', '""')}", "${article.authors.replace('"', '""')}", "${article.abstract.replace('"', '""')}", "${article.publication_date}", "${article.doi}", "${article.pmid}","${article.pmcid}"`
            ).join('\n')
          exportedResults = `${header}${articleRows}`;
        }
       else if (format === 'ris') {
         exportedResults = articles.map(article =>
             `TY  - JOUR \nAU  - ${article.authors.replace('"', '""')} \nTI  - ${article.title.replace('"', '""')} \nAB  - ${article.abstract.replace('"', '""')} \nDO  - ${article.doi} \nER  -`
         ).join('\n');
       }
       else if (format === 'bibtex') {
             exportedResults = articles.map(article =>
                 `@article{${article.pmid},
             author    = {${article.authors.replace('"', '""')}},
              title     = {${article.title.replace('"', '""')}},
             journal   = {Sample Journal},
             year      = {${new Date(article.publication_date).getFullYear()}},
             doi       = {${article.doi}}
           }`
             ).join('\n')
       }
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="search_results.${format}"`);
        res.status(200).send(exportedResults)
    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to export search results.');
    }
});
/**
 * @swagger
 * /citation/format:
 *   post:
 *     summary: Format a citation
 *     description: Format a citation string based on the provided style
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               citation:
 *                 type: string
 *                 description: The citation string to format
 *               style:
 *                  type: string
 *                  description: The citation style e.g. APA, MLA, Chicago, Vancouver
 *             example:
 *                 citation: "Sample citation"
 *                 style: "apa"
 *     responses:
 *       200:
 *         description: citation formatted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    formatted_citation:
 *                      type: string
 *                      description: The formatted citation
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Citation and Style is required'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to format citation.'
 */
router.post('/citation/format', authenticateToken,
    [
        body('citation').notEmpty().isString().trim().withMessage('Citation is required'),
        body('style').notEmpty().isString().trim().isIn(['apa', 'mla', 'chicago', 'vancouver']).withMessage('Style is required and must be a valid style type. ')
    ],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
  const {citation, style} = req.body;
    try {
        const locale = 'en-US';
        const citeprocEngine = new citeproc.Citeproc(citeproc.getLocale(locale));
        const citationData = [{id: '1', citation: citation}] // Dummy Data
        citeprocEngine.registerCitationData(citationData);
           citeprocEngine.setStyle(style)
           const formatted = citeprocEngine.formatCitation([['1']])
           res.status(200).json({formatted_citation: formatted})

     } catch (error) {
          handleAPIError(res, error, 500, 'Failed to format citation.');
      }
});
/**
 * @swagger
 * /citation/bibliography:
 *   post:
 *     summary: Generate bibliography.
 *     description: Generates bibliography based on the citations and the style
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               citations:
 *                 type: string
 *                 description: The citations to format and generate bibliography.
 *               style:
 *                 type: string
 *                 description: The citation style to use for bibliography e.g. APA, MLA, Chicago, Vancouver
 *             example:
 *                citations: "citation1 \n citation2 \n citation3"
 *                style: "apa"
 *     responses:
 *       200:
 *         description: Bibliography generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    bibliography:
 *                      type: string
 *                      description: The generated bibliography based on given citations and style
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Please provide citations and style for bibliography.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to generate bibliography.'
 */
router.post('/citation/bibliography', authenticateToken,
    [
        body('citations').notEmpty().isString().trim().withMessage('Citations are required'),
         body('style').notEmpty().isString().trim().isIn(['apa', 'mla', 'chicago', 'vancouver']).withMessage('Style is required and must be a valid style type. ')
    ],
     async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const {citations, style } = req.body;
   try {
         const citeprocEngine = new citeproc.Citeproc(citeproc.getLocale('en-US'));
         const citationArray = citations.split('\n').map((citation, index) => ({id: (index+1).toString(), citation: citation }))

        citeprocEngine.registerCitationData(citationArray);
         citeprocEngine.setStyle(style);
         const formatted = citeprocEngine.formatBibliography().join('\n');
         res.status(200).json({bibliography: formatted});

    } catch (error) {
        handleAPIError(res, error, 500, 'Failed to generate bibliography.');
    }
});
/**
 * @swagger
 * /citation/link:
 *   post:
 *     summary: Link citation to the article full text
 *     description: Links a citation to the full text article
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doi:
 *                 type: string
 *                 description: DOI of the article for the link.
 *               pmid:
 *                 type: string
 *                 description: PMID of the article for the link.
 *             example:
 *                 doi: "10.1000/xyz123"
 *                 pmid: "1234567"
  *
 *     responses:
 *       200:
 *         description: Successfully linked the citation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                    link:
 *                       type: string
 *                       description: Link to the article full text
 *       400:
 *          description: Bad request, input is not valid.
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                    message:
 *                       type: string
 *                       description: The message returned by the system.
 *              example:
 *                message: 'Please provide doi or pmid for the article.'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *                message: 'Failed to link the article.'


 */
router.post('/citation/link', authenticateToken,
    [
        body('doi').optional().isString().trim().matches(/^10.\d{4,9}\/[-._;()\/\\<>A-Z0-9]+$/i).withMessage('Invalid DOI format.'),
        body('pmid').optional().isString().trim().matches(/^\d+$/).withMessage('Invalid PMID format')
    ],
     async (req, res) => {
          const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: errors.array()[0].msg });
        }
    const { doi, pmid } = req.body;
    if(!doi && !pmid) return res.status(400).json({message: 'Please provide doi or pmid for the article.'})
   try {
       let link = null;
          if(doi) {
             const cacheKey = `unpaywall_${doi}`;
              const cachedData = cache.get(cacheKey);
            if (cachedData) {
                link = cachedData;
               } else {
                   try{
                       const response = await unpaywallApi.get(doi);
                       link = response.data?.best_oa_location?.url || `https://doi.org/${doi}`
                       cache.set(cacheKey, link);
                   } catch(unpaywallError){
                      link = `https://doi.org/${doi}`
                       console.error("Error fetching from Unpaywall:", unpaywallError);
                   }
              }
        } else {
               link = `https://pubmed.ncbi.nlm.nih.gov/${pmid}`
           }
           res.status(200).json({link});
    } catch (error) {
         handleAPIError(res, error, 500, 'Failed to link the article.');
     }
});

module.exports = router;
