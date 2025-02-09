(function() {

  // 1. Input Handling
  function addInputField() {
    const newInputGroup = `
            <div class="input-group mb-2">
                <select class="form-control field-select">
                    <option value="tiab">Title/Abstract</option>
                    <option value="tw">Text Word</option>
                    <option value="mesh">MeSH Terms</option>
                </select>
                <input type="text" class="form-control term-input" placeholder="Search term">
                 <button type="button" class="btn btn-danger delete-field-button">Delete</button>
           </div>`;
    $('.query-builder-inputs').append(newInputGroup);

    // Update the main query area using the *current* input field data
    let query = $("#query").val();
    let currentTerm = $(".query-builder-inputs .input-group:last-child .term-input").val();
    const field = $(".query-builder-inputs .input-group:last-child .field-select").val();
    const selectedBoolean = $("input[name='booleanOperator']:checked").val();
    if (currentTerm) {
      let formattedTerm = currentTerm.includes(" ") ? `"${currentTerm}"` : currentTerm; // Corrected here: Use currentTerm instead of term
      let newQuery = `${formattedTerm}[${field}]`;
      if (query) {
        newQuery = `${query} ${selectedBoolean} ${conditionallyAddBrackets(newQuery)}`;
      }
      $("#query").val(newQuery);
    }
  }

  function handleShortForm() {
    let query = $("#query").val();
    let terms = [];
    $(".query-builder-inputs .input-group").each(function() {
      const field = $(this).find(".field-select").val();
      const term = $(this).find(".term-input").val().trim();
      if (term) {
        let formattedTerm = term.includes(" ") ? `"${term}"` : term;
        formattedTerm = formattedTerm.match(/\[(mesh|tiab|tw)\]/gi) ? formattedTerm : `${formattedTerm}[${field}]`;
        terms.push(formattedTerm);
      }
    });
    const selectedBoolean = $("input[name='booleanOperator']:checked").val();
    let newTerms = terms.join(` ${selectedBoolean} `).trim();
    query = query && newTerms ? `${query} ${selectedBoolean} ${newTerms}` : newTerms;
    return query.trim();
  }

  function conditionallyAddBrackets(query) {
    return (query.startsWith("(") && query.endsWith(")")) ? query : `(${query})`;
  }

  function handleKeywordInput() {
    const keywords = $("#keyword-input").val();
    return keywords.split(/\s+/).join(" AND ");
  }

  function handlePICOInput() {
    const population = $("#population").val();
    const intervention = $("#intervention").val();
    const comparison = $("#comparison").val();
    const outcome = $("#outcome").val();

    let query = "";
    if (population) query += `(${population}[tiab]) AND `;
    if (intervention) query += `(${intervention}[tiab]) AND `;
    if (comparison) query += `(${comparison}[tiab]) AND `;
    if (outcome) query += `(${outcome}[tiab])`;

    return query.replace(/ AND $/, ""); // Remove trailing " AND "
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileContent = e.target.result;
        resolve(fileContent);
      };
      reader.onerror = function(error) {
        console.error("File reading error:", error);
        showNotification("Error reading file. Please try again.", 'error');
        reject(error);
      };
      reader.readAsText(file);
    });
  }

    // Global database map
    const databaseMap = {
        pubmed: "PubMed",
        scopus: "Scopus",
        wos: "Web of Science",
        scopus: "Scopus Elsevier (Advanced)",
        embase: "Embase (Elsevier)",
        cochrane: "Cochrane",
        cinahl: "CINAHL",
        psycinfo: "PsycINFO",
        ovid: "Ovid MEDLINE",
        hinari: "HINARI",
        lens: "LENS"
    };


// 2. Highlighting Functions
// 2. Highlighting Functions
function highlightMeshTerms(query) {
  // Incorporating MH and exp for Mesh terms
  const meshRegex = /\[MeSH Terms?\]|MH|\exp|MH\s*\+|\[mh\s*"[^"]*"\]|INDEXTERMS|mesh_term.mesh_heading:|ALL=|exp\s*"[^"]*"\//g; // Corrected for variations & prevent over-matching
  return query.replace(meshRegex, '<span class="mesh-term">$&</span>');
}

function highlightTitleAbstractTerms(query) {
  // Expanded to include variations in different databases for Title/Abstract
  const tiabRegex = /\[Title\/Abstract\]|TITLE-ABS|TI=|TI|AB=|AB|title:|abstract:|ti,ab\(|:\s*ti,ab/g; // Includes variations for different databases
  return query.replace(tiabRegex, '<span class="title-abstract">$&</span>');
}

function highlightTextWordTerms(query) {
  // Text Word terms across different databases
  const twRegex = /\[Text Word\]|TITLE-ABS-KEY|\.mp\.|tw|full_text:|:ab,kw/g; //Expanded set of text word identifiers
  return query.replace(twRegex, '<span class="text-word">$&</span>');
}


function highlightBooleanOperators(query) {
        const booleanRegex = /( AND | OR | NOT )/gi;
        return query.replace(booleanRegex, '<span class="boolean-operator">$&</span>');
    }

  // 4. Translation Functions
  function applyRules(query, database) {
    let translatedQuery = query;
    console.log("In applyRules: ", query) 
    const rules = {
    pubmed: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: '"$1"[MeSH Terms]' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: '"$1"[Title/Abstract]' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: '"$1"[Text Word]' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '$1[MeSH Terms]' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: '$1[Title/Abstract]' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1[Text Word]' },
       //{ regexFrom: '"(.*?)"\\w+\\]', regexTo: '"$1"' },//New
    ],
    ovid: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'exp "$1"/' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: '"$1".tw.' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: '"$1".mp.' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '/exp "$1"' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: '$1.tw.' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1.mp.' },
    ],
    cochrane: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: '[mh "$1"]' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: '"$1":ti,ab' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '[mh $1]' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: '$1:ti,ab' },
    ],
    psycinfo: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'exp "$1"/' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: '"$1".tw.' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: '"$1".mp.' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '/exp "$1"' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: '$1.tw.' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1.mp.' },
    ],
    embase: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: '/exp "$1"' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: '$1:ti,ab' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '/exp "$1"' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: '$1:ti,ab' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1' },
        { regexFrom: '(\\w+)\\*', regexTo: '$1$' },
    ],
    wos: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'ALL="$1"' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: 'TI="$1" OR AB="$1"' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: 'ALL=$1' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: 'TI=$1 OR AB=$1' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1' },
    ],
    scopus: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'INDEXTERMS("$1")' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: 'TITLE-ABS("$1")' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: 'TITLE-ABS-KEY("$1")' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: 'INDEXTERMS("$1")' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: 'TITLE-ABS("$1")' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: 'TITLE-ABS-KEY("$1")' },
        //{ regexFrom: '"(.*?)"\\w+\\]', regexTo: 'ALL("$1")' },//New
    ],
    cinahl: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'MH "$1+"' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: 'TI "$1" OR AB "$1"' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: '$1' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: 'MH $1+' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: 'TI $1 OR AB $1' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1' },
    ],
    hinari: [
        { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: '[MeSH Term] "$1"' },
        { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: 'ti,ab("$1")' },
        { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: '$1' },
        { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: '[MeSH Term] $1' },
        { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: 'ti,ab($1)' },
        { regexFrom: /(\w+)\[(tw)\]/g, regexTo: '$1' },
        ],
    lens: [
      { regexFrom: /"([^"]+)"\[(mesh)\]/g, regexTo: 'mesh_term.mesh_heading:("$1")' },
      { regexFrom: /"([^"]+)"\[(tiab)\]/g, regexTo: 'title:("$1") OR abstract:("$1")' },
      { regexFrom: /"([^"]+)"\[(tw)\]/g, regexTo: 'full_text:("$1")' },
      { regexFrom: /(\w+)\[(mesh)\]/g, regexTo: 'mesh_term.mesh_heading:($1)' },
      { regexFrom: /(\w+)\[(tiab)\]/g, regexTo: 'title:($1) OR abstract:($1)' },
      { regexFrom: /(\w+)\[(tw)\]/g, regexTo: 'full_text:($1)' },
    ],        

};




    const translationRules = rules[database.toLowerCase()];
    if (translationRules) {
      translationRules.forEach(rule => {
        translatedQuery = translatedQuery.replace(new RegExp(rule.regexFrom, 'gi'), rule.regexTo);
      });
    }
    console.log("Translated Query: ", translatedQuery);
    return translatedQuery;
  }

  function translateQuery(query, database) { // This is a new function
        return applyRules(query, database);
    }
    function translateQueries() {
        const originalQuery = $("#query").val();

        const selectedDatabases = [];
        $("input[type='checkbox']:checked").each(function() {
            selectedDatabases.push($(this).val());
        });

        if (selectedDatabases.length === 0) {
            showNotification("Please select at least one database.", 'error');
            return;
        }


function applyRules(query, database) {
  let translatedQuery = query;//updated 

  const translationRules = rules[database.toLowerCase()];
  if (translationRules) {
    translationRules.forEach(rule => {
      translatedQuery = translatedQuery.replace(rule.regexFrom, rule.regexTo);
      console.log(`After applying rule: ${rule.regexFrom}, result: ${translatedQuery}`);
    });
  }
  return translatedQuery;
}
        const translatedQueries = {};
        selectedDatabases.forEach(database => {
            translatedQueries[database] = translateQuery(originalQuery, database);  //call translateQuery and store value
        });
        console.log("translatedQueries :", translatedQueries)
        renderTranslateQueries(translatedQueries);
    }



  
  // 3. Output Rendering//



// 3. Output Rendering (Applying Highlighting *After* Translation)
function renderTranslateQueries(translatedQueries) {
  const translatedQueriesDiv = $("#translated-queries");
  translatedQueriesDiv.empty();

  for (const database in translatedQueries) {
    const translatedQuery = translatedQueries[database];

    if (translatedQuery && translatedQuery.length > 0) {

      // Apply the highlighting functions in sequence
      let highlightedQuery = translatedQuery;
      highlightedQuery = highlightMeshTerms(highlightedQuery);
      highlightedQuery = highlightTitleAbstractTerms(highlightedQuery);
      highlightedQuery = highlightTextWordTerms(highlightedQuery);
      translatedQuery = highlightBooleanOperators(translatedQuery);

      const card = $("<div>").addClass("card mb-3");
      const cardHeader = $("<div>").addClass("card-header").text(databaseMap[database]);
      const cardBody = $("<div>").addClass("card-body");

      const queryContainer = $("<div>").addClass("translated-query-container");
      const queryPre = $("<pre>").html(highlightedQuery); // Use highlighted query

      const copyButton = $("<button>").addClass("btn btn-info copy-button").text("Copy");
      const downloadButton = $("<button>").addClass("btn btn-success download-button").text("Download").data("database", database);

      copyButton.click(function() {
        copyToClipboard($(this).prev("pre").text());
        $(this).text("Copied!");
        setTimeout(() => $(this).text("Copy"), 2000);
      });
      downloadButton.click(function() {
        const queryToDownload = $(this).prev("pre").text();
        const database = $(this).data("database");
        downloadQuery(queryToDownload, database);
      });

      queryContainer.append(queryPre, copyButton, downloadButton);
      cardBody.append(queryContainer);
      card.append(cardHeader, cardBody);
      translatedQueriesDiv.append(card);
    } else {
      console.error("translatedQuery is empty or undefined for database:", database);
    }
  }
}

  // 4. Clipboard and Download (Keep these functions)
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showNotification('Query copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
        showNotification("Error copying query to clipboard", 'error');
      });
  }

  function showNotification(message, type) {
    const notificationDiv = $("#notification");
    notificationDiv.text(message);
    notificationDiv.removeClass("success error warn");
    notificationDiv.addClass(type);
    notificationDiv.fadeIn();
    setTimeout(() => notificationDiv.fadeOut(), 3000);
  }

  function downloadQuery(query, database) { //Ensure to use this function
    //  get the already translatedQuery from the output area
    let translatedQuery = "";

    const databaseName = databaseMap[database] || database; // Handle cases where the database is not found in databaseMap

    const translatedQueriesDiv = $("#translated-queries");
    translatedQueriesDiv.find(".card").each(function() {
      const headerText = $(this).find(".card-header").text();
      if (headerText === databaseName) {
        translatedQuery = $(this).find(".translated-query-container pre").text();
        return false; // Exit the loop when the database name is found
      }
    });

    const blob = new Blob([translatedQuery], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated_query_${database}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAllQueries(translatedQueries) { // Ensure to use this function
    let combinedText = "";

    for (const database in translatedQueries) {
      // Strip HTML tags from the translated query
      const translatedQuery = translatedQueries[database].replace(/<[^>]*>/g, ''); // Remove HTML tags
      combinedText += `${databaseMap[database]}:\n${translatedQuery}\n\n`;
    }
    const blob = new Blob([combinedText], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translated_queries_all.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 5. Query History Management
  function loadQueryHistory() {
    const history = localStorage.getItem('queryHistory');
    return history ? JSON.parse(history) : [];
  }

  function saveQueryHistory(history) {
    localStorage.setItem('queryHistory', JSON.stringify(history));
  }

  function clearQueryHistory() {
    localStorage.removeItem('queryHistory');
    $("#query-history-table tbody").empty();
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
      const row = `<tr data-index="${index}" style="cursor: pointer;"><td>#${index + 1}</td><td>${addBracketsForDisplay(entry)}</td><td>${formattedDate} ${formattedTime}</td><td><div class="history-actions"><button class="btn btn-info btn-sm edit-history-button">Edit</button>  <button class="btn btn-secondary btn-sm copy-history-button">Copy</button>   <button class="btn btn-danger btn-sm delete-history-button">Delete</button> <button class="btn btn-success btn-sm build-history-button">Build</button>  
            <button class="btn btn-primary btn-sm translate-history-button">Translate</button></div></td></tr>`;

      function addBracketsForDisplay(query) { // New function to add brackets only for display
        if (query.startsWith("(") && query.endsWith(")")) {
          return query;
        } else {
          return `(${query})`; // Add brackets only for display in the table
        }
      }
      tableBody.append(row);
    });
  }

  function addToHistory(query) {
    const history = loadQueryHistory();
    history.push(query);
    saveQueryHistory(history);
    renderQueryHistoryTable(history);
  }

  function downloadQueryHistory() {
    const history = loadQueryHistory();
    const text = history.map((entry, index) => `#${index + 1}: ${entry}`).join('\n');
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

  // 6. Event Listeners
  $(document).ready(function() 
  { //Load saved history to the table
    const databaseMap = { //Add variable here
      pubmed: "PubMed",
      scopus: "Scopus",
      wos: "Web of Science",
      embase: "Embase (Elsevier)",
      cochrane: "Cochrane",
      cinahl: "CINAHL",
      psycinfo: "PsycINFO",
      ovid: "Ovid MEDLINE",
      hinari: "HINARI",
      lens: "LENS"
    };
    renderQueryHistoryTable(loadQueryHistory());

    $(".add-field-button").click(function() {
      let currentTerm = $(".query-builder-inputs .input-group:last-child .term-input").val();
      const field = $(".query-builder-inputs .input-group:last-child .field-select").val();
      const selectedBoolean = $("input[name='booleanOperator']:checked").val();
      let query = $("#query").val();
      let formattedTerm = currentTerm.includes(" ") ? `"${currentTerm}"` : currentTerm;
      let newQuery = `${formattedTerm}[${field}]`
      if (query) {
        newQuery = `${query} ${selectedBoolean} ${conditionallyAddBrackets(newQuery)}`;
      }
      $("#query").val(newQuery);
      addInputField();
    });
    $(".boolean-radio").on("click", function() {});
    $("#clearButton").click(function() {
      $("#query").val("");
      $(".query-builder-inputs").empty();
      addInputField();
    });
    addInputField();

    //NEW: Activate Delete Field Buttons
    $(document).on('click', '.delete-field-button', function() { //Use event delegation
      $(this).closest('.input-group').remove();
      updateQueryFromFields(); // Function to update the query box, you'll need to define this
    });

    //NEW: Select All Checkbox
   // $('#select-all-databases').on('click', function() { //Assuming you have a checkbox with this ID
    //  const isChecked = $(this).prop('checked');
  //    $('input[name="database"]').prop('checked', isChecked); //Assuming your checkboxes have name="database"
 //   });

    // Full Form Input
    $("#query").on("blur", function() {
      const currentQuery = $(this).val();
      const history = loadQueryHistory();
      if (history[history.length - 1] !== currentQuery) {
        addToHistory(currentQuery);
      }
    });
    // Keyword Input
    $("#keyword-submit").click(function() {
      handleKeywordInput();
    });
    // File Upload
    $("#file-upload").change(function(e) {
        handleFileUpload(e).then(fileContent => {
            $("#query").val(fileContent); // Load file content into the query box
        }).catch(error => {
            console.error("Error handling file upload:", error);
        });
    });
    // Checkbox event listeners
    $('#select-all-button').on('click', function() {
      const checkboxes = document.querySelectorAll('.form-check-input');
      checkboxes.forEach(checkbox => {
        checkbox.checked = true; // Check all checkboxes
      });
    });

    $('#deselect-all-button').on('click', function() {
      const checkboxes = document.querySelectorAll('.form-check-input');
      checkboxes.forEach(checkbox => {
        checkbox.checked = false; // Uncheck all checkboxes
      });
    });
    // Query box buttons
    $("#query-box-controls").append(
      '<button class="btn btn-secondary clear-query-button">Clear</button>',
      '<button class="btn btn-info copy-query-button">Copy</button>',
      '<button class="btn btn-secondary paste-query-button">Paste</button>',
      '<button class="btn btn-secondary undo-query-button">Undo</button>',
      '<button class="btn btn-secondary redo-query-button">Redo</button>'
    );
    let queryHistory = [""];
    let historyIndex = 0;
    $("#query-box-controls").on("click", ".clear-query-button", function() {
      $("#query").val("");
      queryHistory = [""];
      historyIndex = 0;
    });
    $("#query-box-controls").on("click", ".copy-query-button", function() {
      copyToClipboard($("#query").val());
    });
    $("#query-box-controls").on("click", ".paste-query-button", async function() {
      try {
        const text = await navigator.clipboard.readText();
        $("#query").val(text);
        addToHistory(text);
      } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
        showNotification("Failed to paste from clipboard", "error");
      }
    });
    $("#query-box-controls").on("click", ".undo-query-button", function() {
      if (historyIndex > 0) {
        historyIndex--;
        $("#query").val(queryHistory[historyIndex])
      }
    });
    $("#query-box-controls").on("click", ".redo-query-button", function() {
      if (historyIndex < queryHistory.length - 1) {
        historyIndex++;
        $("#query").val(queryHistory[historyIndex])
      }
    });

    function addToHistoryToQueryBox(query) {
      if (queryHistory[historyIndex] !== query) {
        queryHistory = queryHistory.slice(0, historyIndex + 1)
        queryHistory.push(query);
        historyIndex++;
      }
      if (queryHistory.length > 10) {
        queryHistory = queryHistory.slice(queryHistory.length - 10)
        historyIndex = queryHistory.length - 1
      }
    }
    $("#query").on("input", function() {
      addToHistoryToQueryBox($(this).val())
    });
    // Translate Button
    $("#translate-button").click(function() {
      translateQueries();
    });
    // Download All Button
    $("#download-all-button").click(function() {
      const originalQuery = $("#query").val();
      const selectedDatabases = [];
      $("input[type='checkbox']:checked").each(function() {
        selectedDatabases.push($(this).val());
      });
      if (selectedDatabases.length === 0) {
        showNotification("Please select at least one database.", 'error');
        return;
      }
      const translatedQueries = {};
      selectedDatabases.forEach(database => {
        translatedQueries[database] = translateQuery(originalQuery, database);
      });
      downloadAllQueries(translatedQueries)
    });
    // Copy functionality (delegated event handling)
    $("#translated-queries").on("click", ".copy-button", function() {
      const queryToCopy = $(this).prev("pre").text();
      copyToClipboard(queryToCopy);
    });
    // Download functionality (delegated event handling)
    $("#translated-queries").on("click", ".download-button", function() {
      const query = $("#query").val();
      const database = $(this).data("database");
      downloadQuery(query, database);
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

    $("#query-history-table").on("click", ".translate-history-button", function(event) {
      event.stopPropagation();

      const index = $(this).closest("tr").data("index");
      const history = loadQueryHistory();

      if (history && history[index]) {
        const originalQuery = history[index];

        const selectedDatabases = [];
        $("input[type='checkbox']:checked").each(function() {
          selectedDatabases.push($(this).val());
        });

        if (selectedDatabases.length === 0) {
          showNotification("Please select at least one database.", 'error');
          return;
        }

        const translatedQueries = {}; // This is where you store the translated queries

        selectedDatabases.forEach(database => {
          translatedQueries[database] = translateQuery(originalQuery, database);

        });

        renderTranslateQueries(translatedQueries);
      }

    });

  });

  function updateQueryFromFields() {
    //this re-generate main query area from field to to match current data
    let query = "";
    let selectedBoolean = $("input[name='booleanOperator']:checked").val();
    $(".query-builder-inputs .input-group").each(function(index) {
      const field = $(this).find(".field-select").val();
      const term = $(this).find(".term-input").val().trim();
      if (term) {
        let formattedTerm = term.includes(" ") ? `"${term}"` : term;
        let newQuery = `${formattedTerm}[${field}]`;
        if (query) {
          query = `${query} ${selectedBoolean} ${newQuery}`;
        } else {
          query = newQuery;
        }
      }
    });
    $("#query").val(query);
  }

  // ... (Remaining functions) ...
})();
