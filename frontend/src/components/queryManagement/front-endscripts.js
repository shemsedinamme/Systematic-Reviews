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



//to be commented

  //  Here all the steps, including setting event listeners for each added input field.
  $('.query-builder-inputs').on('change', '.field-select, .term-input', updateQueryFromFields);
  $('input[name="booleanOperator"]').on('change', updateQueryFromFields);
  $(".add-field-button").click(function() {
    addInputField();
  });
  // Activate Delete Field Buttons
  $(document).on('click', '.delete-field-button', function() { //Use event delegation
    $(this).closest('.input-group').remove();
    updateQueryFromFields(); // Function to update the query box, you'll need to define this
  });
  // Select All Checkbox
  $('#select-all-databases').on('click', function() { //Assuming you have a checkbox with this ID
    const isChecked = $(this).prop('checked');
    $('input[name="database"]').prop('checked', isChecked); //Assuming your checkboxes have name="database"
  });

  // Clear Query History
  $(".clear-history-button").on("click", function() {
    clearQueryHistory();
  });
  // Download Query History
  $(".download-history-button").on("click", function() {
    downloadQueryHistory();
  });
  // Access history from table
  $("#query-history-table").on("click", "tr", function() {
    const index = $(this).data("index");
    const history = loadQueryHistory();
    if (history && history[index]) {
      const selectedBoolean = $("input[name='booleanOperator']:checked").val();
      let currentQuery = $("#query").val();
      const newQuery = conditionallyAddBrackets(history[index]);
      if (currentQuery) {
        $("#query").val(`${currentQuery} ${selectedBoolean} ${newQuery}`);
      } else {
        $("#query").val(newQuery);
      }
      showNotification(`Loaded history entry #${index + 1} to query box`, 'success');
    }
  });
  $("#add-to-query-button").on("click", function() {
    const currentQuery = $("#query").val();
    if (currentQuery) {
      addToHistory(currentQuery);
    }
  });
  $("#query-history-table").on("click", ".edit-history-button", function(event) {
    event.stopPropagation();
    const index = $(this).closest("tr").data("index");
    const history = loadQueryHistory();
    if (history && history[index]) {
      $("#query").val(history[index]);
      showNotification(`Loaded history entry #${index + 1} to query box for editing`, 'success');
    }
  });
  $("#query-history-table").on("click", ".copy-history-button", function(event) {
    event.stopPropagation();
    const index = $(this).closest("tr").data("index");
    const history = loadQueryHistory();
    if (history && history[index]) {
      copyToClipboard(history[index]);
    }
  });
  $("#query-history-table").on("click", ".delete-history-button", function(event) {
    event.stopPropagation();
    const index = $(this).closest("tr").data("index");
    let history = loadQueryHistory();
    if (history && history[index]) {
      history.splice(index, 1);
      saveQueryHistory(history);
      renderQueryHistoryTable(history);
      showNotification(`Deleted history entry #${index + 1}`, 'success');
    }
  });
  $("#query-history-table").on("click", ".build-history-button", function(event) {
    event.stopPropagation();
    const index = $(this).closest("tr").data("index");
    const history = loadQueryHistory();
    if (history && history[index]) {
      $("#query").val(history[index]);
      showNotification(`Loaded history entry #${index + 1} to query box`, 'success');
    }
  });

  //Here's the query builder function.
  function updateQueryFromFields() {
    let query = "";
    const selectedBoolean = $('input[name="booleanOperator"]:checked').val();
    $('.query-builder-inputs .input-group').each(function(index) {
      const field = $(this).find('.field-select').val();
      const term = $(this).find('.term-input').val().trim();
      if (term) {
        let formattedTerm = term.includes(" ") ? `"${term}"` : term;
        let newQuery = `${formattedTerm}[${field}]`;
        if (query) {
          newQuery = `${query} ${selectedBoolean} ${conditionallyAddBrackets(newQuery)}`;
        }
        query = newQuery; // Accumulate the query
      }
    });
    $("#query").val(query); // Output the query in the right space to check the output
  }

  // Initial call to add an input field
  addInputField();
  
  
});

// -- Utility Functions --
function showNotification(message, type) {
  // Implemented a basic message for the web
  alert(`${type.toUpperCase()}: ${message}`);
}

function copyToClipboard(text) {
  // Implemented basic copy message
  navigator.clipboard.writeText(text)
    .then(() => {
      showNotification('Query copied to clipboard!', 'success');
    })
    .catch(err => {
      console.error("Failed to copy: ", err);
      showNotification("Error copying query to clipboard", 'error');
    });
}

function downloadQuery(query, queryForm) {
  const savedQuery = savedQuery(query, queryForm);

  // Create a blob and download it
  const blob = new Blob([savedQuery], {
    type: 'text/plain'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `savedQuery_${queryForm}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadQueryHistory() {
  // Local Storage Key
  const storageKey = 'queryHistory';
  // Parse and local storage here.
  const history = localStorage.getItem(storageKey);
  return history ? JSON.parse(history) : [];
}

function saveQueryHistory(history) {
  const storageKey = 'queryHistory';
  // Use local storage functions as needed
  localStorage.setItem(storageKey, JSON.stringify(history));
}

function clearQueryHistory() {
  const storageKey = 'queryHistory';
  localStorage.removeItem(storageKey);
}

function renderQueryHistoryTable(history) {
  const tableBody = $("#query-history-table tbody");
  tableBody.empty();

  history.forEach((entry, index) => {
    const date = new Date();
    const formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const formattedDate = date.toLocaleDateString();

    const row = `
            <tr data-index="${index}" style="cursor: pointer;">
                <td>#${index + 1}</td>
                <td>${addBracketsForDisplay(entry)}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>
                    <div class="history-actions">
                        <button class="btn btn-info btn-sm edit-history-button">Edit</button>
                        <button class="btn btn-secondary btn-sm copy-history-button">Copy</button>
                        <button class="btn btn-danger btn-sm delete-history-button">Delete</button>
                        <button class="btn btn-success btn-sm build-history-button">Build</button>
                        <button class="btn btn-primary btn-sm translate-history-button">Translate</button>
                    </div>
                </td>
            </tr>`;
    tableBody.append(row);
  });
}

function downloadQueryHistory() {
  const history = loadQueryHistory();
  const text = history.map((entry, index) => `#${index + 1}: ${entry}`).join('\n');

  // Create a blob and download it
  const blob = new Blob([text], {
    type: 'text/plain'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'query_history.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function conditionallyAddBrackets(query) {
  if (query.startsWith("(") && query.endsWith(")")) {
    return query;
  } else {
    return `(${query})`;
  }
}
// Local Storage Implemented
function addToHistory(query) {
  const history = loadQueryHistory();
  history.push(query);
  saveQueryHistory(history);
  renderQueryHistoryTable(history);
}
//  Local Storage Implemented: This code should go to separate javascript files to test local storage!





