//SearchRoutes.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../../database');
const { authenticateToken, authorizeRole } = require('../../middleware/authMiddleware');
const { sanitizeInput, handleError } = require('../../utils');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Destination for uploaded files
const fs = require('fs').promises; // Use promises for file system operations
const router = express.Router();

// Mock Local Storage for query history.  **IN-MEMORY ONLY, DO NOT USE IN PRODUCTION**
let queryHistory = [];
let queryText = '';
// Global database map
const databaseMap = {
  pubmed: "PubMed",
  scopus: "Scopus",
  wos: "Web of Science",
  embase: "Embase",
  cochrane: "Cochrane",
  cinahl: "CINAHL",
  psycinfo: "PsycINFO",
  ovid: "Ovid MEDLINE",
  hinari: "HINARI",
  lens: "LENS"
};

// --- Helper Functions ---

function conditionallyAddBrackets(query) {
  return (query.startsWith("(") && query.endsWith(")")) ? query : `(${query})`;
}
  
function handleShortForm(query, terms, selectedBoolean) {
  let newTerms = terms.join(` ${selectedBoolean} `).trim();
  query = query && newTerms ? `${query} ${selectedBoolean} ${newTerms}` : newTerms;
  return query.trim();
}

// 1. Input Handling
function addInputField(currentTerm, field, selectedBoolean, query) {
    if (currentTerm) {
      let formattedTerm = currentTerm.includes(" ") ? `"${currentTerm}"` : currentTerm;
      let newQuery = `${formattedTerm}[${field}]`;
      if (query) {
        newQuery = `${query} ${selectedBoolean} ${conditionallyAddBrackets(newQuery)}`;
      }
      return newQuery;
    }
    return query;
}

// Query collate functions:
function collateShortForm(terms) {
    let query = '';
    if (terms && terms.length > 0) {
        query = terms.join(' ');
    }
    return query.trim();
}

function collateKeyword(keywords) {
    return keywords.split(/\s+/).join(" AND ");
}

function collatePICO(population, intervention, comparison, outcome) {
    let query = "";
    if (population) query += `(${population}[tiab]) AND `;
    if (intervention) query += `(${intervention}[tiab]) AND `;
    if (comparison) query += `(${comparison}[tiab]) AND `;
    if (outcome) query += `(${outcome}[tiab])`;

    return query.replace(/ AND $/, "");
}
// Helper function to upload and prepare file
async function handleFileUpload(filePath) {
    try {
        const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
        return fileContent;
    } catch (error) {
        console.error('File reading error:', error);
        throw new Error("Error reading file. Please try again.");
    } finally {
        // Clean up the uploaded file
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('Error deleting file:', unlinkError);
        }
    }
}

// 2. Highlighting Functions
function highlightMeshTerms(query) {
  const meshRegex = /\[MeSH\sTerms?\]|MH\s+\"[^"]+\+\"|MH\s+[^"]+\+|\[mh\s*"[^"]*"\]|INDEXTERMS\("[^"]+"\)|mesh_term\.mesh_heading:\("[^"]+"\)/g;
  return query.replace(meshRegex, '<span class="mesh-term">$&</span>');
}

function highlightTitleAbstractTerms(query) {
  const tiabRegex = /\[Title\/Abstract\]|TITLE-ABS\("[^"]+"\)|TI\s*=\s*("[^"]+"|[^"]+)\s*OR\s*AB\s*=\s*("[^"]+"|[^"]+)|ti,ab\("[^"]+"\)/g;
  return query.replace(tiabRegex, '<span class="title-abstract">$&</span>');
}

function highlightTextWordTerms(query) {
  const twRegex = /\[Text\sWord\]|TITLE-ABS-KEY\("[^"]+"\)|full_text:\("[^"]+"\)|:ab,kw/g;
  return query.replace(twRegex, '<span class="text-word">$&</span>');
}

function addQuoteSpans(query) {
  return query.replace(/"([^"]*)"/g, '<span class="quotation-mark">"$1"</span>');
}

function addBracketSpans(query) {
  return query.replace(/([()])/g, '<span class="bracket">$&</span>');
}

function highlightUntaggedTerms(query) {
  const regex = /(\b\w+\b)(?!([^[]*\]))/g; // Match whole words not inside [] tags
  return query.replace(regex, '<span class="untagged-term">$&</span>');
}

// 3. Translation Functions
function applyRules(query, database) {
  let translatedQuery = query;
  const rules = {
    pubmed: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: '"$1"[MeSH Terms]'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: '"$1"[Title/Abstract]'
      },
      {
        regexFrom: /"([^"]+)"\[(tw)\]/g,
        regexTo: '"$1"[Text Word]'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '$1[MeSH Terms]'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: '$1[Title/Abstract]'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1[Text Word]'
      },
    ],
    ovid: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'exp "$1"/'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: '"$1".tw.'
      },
      {
        regexFrom: /"([^"]+)"\[(tw)\]/g,
        regexTo: '"$1".mp.'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '/exp "$1"'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: '$1.tw.'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1.mp.'
      },
    ],
    cochrane: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: '[mh "$1"]'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: '"$1":ti,ab'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '[mh $1]'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: '$1:ti,ab'
      },
    ],
    psycinfo: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'exp "$1"/'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: '"$1".tw.'
      },
      {
        regexFrom: /"([^"]+)"\[(tw)\]/g,
        regexTo: '"$1".mp.'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '/exp "$1"'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: '$1.tw.'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1.mp.'
      },
    ],
    embase: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: '/exp "$1"'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: '$1:ti,ab'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '/exp "$1"'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: '$1:ti,ab'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
      {
        regexFrom: '(\\w+)\\*',
        regexTo: '$1$'
      },
    ],
    wos: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'ALL="$1"'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: 'TI="$1" OR AB="$1"'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: 'ALL=$1'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: 'TI=$1 OR AB=$1'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
    ],
    scopus: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'INDEXTERMS("$1")'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: 'TITLE-ABS("$1")'
      },
      {
        regexFrom: /"([^"]+)"\[(tw)\]/g,
        regexTo: 'TITLE-ABS-KEY("$1")'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: 'INDEXTERMS("$1")'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: 'TITLE-ABS("$1")'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: 'TITLE-ABS-KEY("$1")'
      },
    ],
    cinahl: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'MH "$1+"'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: 'TI "$1" OR AB "$1"'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: 'MH $1+'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: 'TI $1 OR AB $1'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
    ],
    hinari: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: '[MeSH Term] "$1"'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: 'ti,ab("$1")'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: '[MeSH Term] $1'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: 'ti,ab($1)'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: '$1'
      },
    ],
    lens: [{
        regexFrom: /"([^"]+)"\[(mesh)\]/g,
        regexTo: 'mesh_term.mesh_heading:("$1")'
      },
      {
        regexFrom: /"([^"]+)"\[(tiab)\]/g,
        regexTo: 'title:("$1") OR abstract:("$1")'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: 'full_text:($1)'
      },
      {
        regexFrom: /(\w+)\[(mesh)\]/g,
        regexTo: 'mesh_term.mesh_heading:($1)'
      },
      {
        regexFrom: /(\w+)\[(tiab)\]/g,
        regexTo: 'title:($1) OR abstract:($1)'
      },
      {
        regexFrom: /(\w+)\[(tw)\]/g,
        regexTo: 'full_text:($1)'
      },
    ]
  };

  const translationRules = rules[database.toLowerCase()];
  if (translationRules) {
    translationRules.forEach(rule => {
      translatedQuery = translatedQuery.replace(new RegExp(rule.regexFrom, 'gi'), rule.regexTo);
    });
  }
  return translatedQuery;
}

function translateQuery(query, database) {
  return applyRules(query, database);
}

// Utility function to display codes (applying it after translation)
function renderTranslateQueries(translatedQuery) {
    let highlightedQuery = translatedQuery;
    highlightedQuery = highlightMeshTerms(highlightedQuery);
    highlightedQuery = highlightTitleAbstractTerms(highlightedQuery);
    highlightedQuery = highlightTextWordTerms(highlightedQuery);
    highlightedQuery = addQuoteSpans(highlightedQuery);
    highlightedQuery = addBracketSpans(highlightedQuery);
    highlightedQuery = highlightUntaggedTerms(highlightedQuery);
    return highlightedQuery;
}

// -- New --
function savedQuery(query, queryForm) {
    let savedQuery = query;
    const queryFormMap = {
        pubmedshort: "PubMed Short",
        pubmedfull: "PubMed Expanded"
    };

    if (!queryFormMap[queryForm.toLowerCase()]) {
        console.error("Invalid queryForm selected:", queryForm);
        return "Error: Invalid queryForm";
    }

    const rules = {
        pubmedfull: [
            { regexFrom: '"(.*?)"\\[mesh\\]', regexTo: '"$1"[MeSH Terms]' },
            { regexFrom: '(\\w+)\\[mesh\\]', regexTo: '$1[MeSH Terms]' },
            { regexFrom: '"(.*?)"\\[tiab\\]', regexTo: '"$1"[Title/Abstract]' },
            { regexFrom: '(\\w+)\\[tiab\\]', regexTo: '$1[Title/Abstract]' },
            { regexFrom: '"(.*?)"\\[tw\\]', regexTo: '"$1"[Text Word]' },
            { regexFrom: '(\\w+)\\[tw\\]', regexTo: '$1[Text Word]' },
            { regexFrom: '(\\w+)\\?', regexTo: '$1*' },
            { regexFrom: '(\\w+)\\*', regexTo: '$1*' },
        ],
        pubmedshort: [
            { regexFrom: '"(.*?)"\\[mesh\\]', regexTo: '"$1"[mesh]' },
            { regexFrom: '(\\w+)\\[mesh\\]', regexTo: '$1[mesh]' },
            { regexFrom: '"(.*?)"\\[tiab\\]', regexTo: '"$1"[tiab]' },
            { regexFrom: '(\\w+)\\[tiab\\]', regexTo: '$1[tiab]' },
            { regexFrom: '"(.*?)"\\[tw\\]', regexTo: '"$1"[tw]' },
            { regexFrom: '(\\w+)\\[tw\\]', regexTo: '$1[tw]' },
            { regexFrom: '(\\w+)\\?', regexTo: '$1*' },
            { regexFrom: '(\\w+)\\*', regexTo: '$1*' },
        ]
    };

    const rulesToApply = rules[queryForm.toLowerCase()];

    if (!rulesToApply) {
        console.error("No term rules found for:", queryForm);
        return query;
    }

    let saved = query;
    let untaggedTerms = [];
    let misspelledTags = [];
    const fieldTagRegex = /\[(mesh|tiab|tw)\]/gi;

    query.split(/( AND | OR | NOT )/g).forEach(term => {
        let processedTerm = term.trim();
        const match = processedTerm.match(fieldTagRegex);

        if (match) {
            let tag = match[0].slice(1, -1).toLowerCase();
            if (!["mesh", "tiab", "tw"].includes(tag)) {
                misspelledTags.push(term);
            } else {
                for (const rule of rulesToApply) {
                    if (rule.regexFrom && rule.regexTo) {
                        processedTerm = processedTerm.replace(new RegExp(rule.regexFrom, 'gi'), rule.regexTo);
                    }
                }
            }
            saved = saved.replace(term, processedTerm);
        } else if (processedTerm && processedTerm !== "AND" && processedTerm !== "OR" && processedTerm !== "NOT") {
            untaggedTerms.push(processedTerm);
            saved = saved.replace(term, `${processedTerm}[tw]`);
        }
    });

    return saved;
}
// 1. Utility function
function showNotification(message, type) {
  // Implement notification functionality
        console.log(`Notification: ${message} (Type: ${type})`);
  return `Notification: ${message} (Type: ${type})`;
}

// Utility function
function copyToClipboard(text) {
  // Implement clipboard copy functionality
  console.log(`Copying the following text to clipboard: ${text}`);
        return `Copying the following text to clipboard: ${text}`;
}

// API Endpoint
/**
 * @swagger
 * /query/transform:
 *   post:
 *     summary: Transforms a query based on the provided query and query format.
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
 *                 description: The search query to be transformed.
 *               queryForm:
 *                 type: string
 *                 description: The format of the query (pubmedshort or pubmedfull).
 *             example:
 *               query: (title:covid-19 OR abstract:covid-19) AND (author:johnson)
 *               queryForm: pubmedshort
 *     responses:
 *       200:
 *         description: Query transformed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transformedQuery:
 *                   type: string
 *                   description: The transformed query.
 *               example:
 *                 transformedQuery: (title:covid-19 OR abstract:covid-19) AND (author:johnson)
 *       400:
 *         description: Bad request, input is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message returned by the system.
 *             example:
 *               message: 'Query and queryForm parameters are required'
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
 *               message: 'Failed to transform the query.'
 */

router.post('/query/transform', authenticateToken, [
  body('query').notEmpty().isString().withMessage('Query is required and must be a string.'),
  body('queryForm').notEmpty().isString().withMessage('Query format is required.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg
    });
  }

  const {
    query,
    queryForm
  } = req.body;

  try {
    let transformedQuery = savedQuery(query, queryForm);
    transformedQuery = renderTranslateQueries(transformedQuery);
    res.status(200).json({
      transformedQuery: transformedQuery
    });
  } catch (error) {
    console.error("Error during query processing:", error);
    return res.status(500).json({
      message: 'Failed to generate query.'
    });
  }
});

/**
 * @swagger
 * /file-upload:
 *   post:
 *     summary: Upload a file to extract the query.
 *     description: Uploads a file containing the query.
 *     consumes:
 *       - multipart/form-data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file containing the query.
 *     responses:
 *       200:
 *         description: Query upload successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newQuery:
 *                   type: string
 *                   description: The extractd upload query.
 *               example:
 *                 newQuery: "(title:covid-19 OR abstract:covid-19) AND (author:johnson)"
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
 *               message: 'Missing file'
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
 *               message: 'Error reading file.'
 */
router.post('/file-upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Missing file' });
    }

    try {
        // Using the new file upload helper function to process the file content
        const fileContent = await handleFileUpload(req.file);

        // Returning the new query as the file content
        res.status(200).json({ newQuery: fileContent });
    } catch (error) {
        console.error('Error handling file upload:', error);
        handleError(res, error, 500, 'Error reading file.');
    }
});

// Implement all function

// Implement the logging mechanism for query activities.
router.use((req, res, next) => {
  // Log all changes to the audit trail.
  const logDetails = {
    user_id: req.user ? req.user.user_id : null,
    action: `${req.method} ${req.path}`,
    target_type: 'api',
    target_id: null,
    details: JSON.stringify(req.body || req.query)
  };
  pool.query('INSERT INTO audit_logs(log_id, user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)', [uuidv4(), logDetails.user_id, logDetails.action, logDetails.target_type, logDetails.target_id, logDetails.details])
  next();
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
 *                doi: "10.1000/test"
 *                pmid: "23423432"
 *     responses:
 *       200:
 *         description: Successfully linked the citation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   link:
 *                      type: string
 *                       description: Link to the article full text
 *             example:
 *                link: "https://test.com/10.1000/test"
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
 *               message: 'Either DOI or PMID are required.'
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
 *                message: 'Failed to link the citation.'
 */
router.post('/citation/link', authenticateToken, [
  body().custom((value, {
    req
  }) => {
    if (!req.body.doi && !req.body.pmid) {
      throw new Error('Either DOI or PMID is required.');
    }
    return true;
  }),
  body('doi').optional().isString().trim().isLength({
    max: 255
  }).withMessage('DOI must be a string not more than 255 characters'),
  body('pmid').optional().isString().trim().isLength({
    max: 255
  }).withMessage('PMID must be a string not more than 255 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg
    });
  }
  const {
    doi,
    pmid
  } = req.body;
  try {
    //TODO - Implement the logic to fetch the link to the full text, based on pmid or doi.
    res.status(200).json({
      link: `Article full text is available at https://test.com/${doi || pmid}`
    });
  } catch (error) {
    console.error('Error linking citation:', error);
    handleError(res, error, 500, 'Failed to link the citation.');
  }
});

module.exports = router;

