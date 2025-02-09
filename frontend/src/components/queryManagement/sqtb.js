(function () {

    // 1. Input Handling
    // Modified - No query handling, update query area directly
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

         // Update the main query area using the *previous* input field data
        let query = $("#query").val();
        let previousTerm = $(".query-builder-inputs .input-group:nth-last-child(2) .term-input").val();
        const previousField = $(".query-builder-inputs .input-group:nth-last-child(2) .field-select").val();
        const selectedBoolean = $("input[name='booleanOperator']:checked").val();

        if (previousTerm) {
          let formattedTerm = previousTerm.includes(" ") ? `"${previousTerm}"` : previousTerm;
            let newQuery = `${formattedTerm}[${previousField}]`;
            if (query) {
                newQuery = `${query} ${selectedBoolean} ${conditionallyAddBrackets(newQuery)}`;
            }
            $("#query").val(newQuery);
        }
    }

    // Modified - No direct main query area manipulation
    function collateShortForm() {
        let query = $("#query").val();
        let terms = [];
        $(".query-builder-inputs .input-group").each(function () {
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
        if (query && newTerms) {
            query += ` ${selectedBoolean} ${newTerms}`;
        } else if (newTerms) {
            query = newTerms;
        }
        query = query.trim();
        return query;
    }

    function conditionallyAddBrackets(query) {
        if (query.startsWith("(") && query.endsWith(")")) {
            return query;
        } else {
            return `(${query})`;
        }
    }

    // Modified - No direct main query area manipulation
    function collateKeyword() {
        const keywords = $("#keyword-input").val();
        return keywords.split(/\s+/).join(" AND ");
    }

    // Modified - No direct main query area manipulation
    function collatePICO() {
        const population = $("#population").val();
        const intervention = $("#intervention").val();
        const comparison = $("#comparison").val();
        const outcome = $("#outcome").val();

        let query = "";
        if (population) query += `(${population}[tiab]) AND `;
        if (intervention) query += `(${intervention}[tiab]) AND `;
        if (comparison) query += `(${comparison}[tiab]) AND `;
        if (outcome) query += `(${outcome}[tiab])`;

        query = query.replace(/ AND $/, ""); // Remove trailing " AND "
        $("#generated-pico-query").val(query);
        return query;

    }

    // Modified - No direct main query area manipulation
    async function collateFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const fileContent = e.target.result;
                resolve(fileContent);
            };
            reader.onerror = function (error) {
                console.error("File reading error:", error);
                showNotification("Error reading file. Please try again.", 'error');
                reject(error);
            };
            reader.readAsText(file);
        });
    }

    // 2. Saved Query Logic
    // Modified - Split into form-specific functions
    function savedQuery(query, queryForm) {
        let savedQuery = query;
        const queryFormMap = {
            pubmedshort: "Generated Query Short Form",
            pubmedfull: "Generated Query Expanded Form"
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
         savedQuery = applyRules(query, rulesToApply);
       return savedQuery;
    }
    // Modified - Utility function used by all form collation methods
    function applyRules(query, rules) {
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
                    for (const rule of rules) {
                        if (rule.from && rule.to) {
                           processedTerm = processedTerm.replace(new RegExp(rule.from, "gi"), rule.to);
                        } else if (rule.regexFrom && rule.regexTo) {
                            processedTerm = processedTerm.replace(new RegExp(rule.regexFrom, "gi"), rule.regexTo);
                       }
                   }
                }
               saved = saved.replace(term, processedTerm);
          }
           else if (processedTerm && processedTerm !== "AND" && processedTerm !== "OR" && processedTerm !== "NOT") {
               untaggedTerms.push(processedTerm);
               saved = saved.replace(term, `${processedTerm}[tw]`);
           }
       });
      if (untaggedTerms.length > 0 || misspelledTags.length > 0) {
          saved = saved.split(/( AND | OR | NOT )/g).map(term => {
               if (untaggedTerms.includes(term.trim())) {
                    return `<span class="untagged-term">${term}</span>`;
                } else if (misspelledTags.includes(term.trim())) {
                    return `<span class="misspelled-tag">${term}</span>`;
                } else {
                    return term;
                }
           }).join("");
       }
       return saved;
    }
    // 3. Output Rendering
    // Modified - Adjust to new format
    function renderSavedQueries(savedQueries) {
        const savedQueriesDiv = $("#constructed-queries");
        savedQueriesDiv.empty();
        const queryFormMap = {
           pubmedshort: "PubMed Short",
           pubmedfull: "PubMed Expanded",
        };
         for (const queryForm in savedQueries) {
           const savedQuery = savedQueries[queryForm];
            const card = $("<div>").addClass("card mb-3");
           const cardHeader = $("<div>").addClass("card-header").text(queryFormMap[queryForm]);
            const cardBody = $("<div>").addClass("card-body");

           const queryContainer = $("<div>").addClass("translated-query-container");
           const queryPre = $("<pre>").html(savedQuery);
            const copyButton = $("<button>").addClass("btn btn-info copy-button").text("Copy");
             const downloadButton = $("<button>").addClass("btn btn-success download-button").text("Download").data("queryForm", queryForm);
            copyButton.click(function () {
               copyToClipboard($(this).prev("pre").text());
               $(this).text("Copied!");
               setTimeout(() => $(this).text("Copy"), 2000);
            });
            downloadButton.click(function () {
                const queryToDownload = $(this).prev("pre").text();
              const queryForm = $(this).data("queryForm");
               downloadQuery(queryToDownload, queryForm);
           });

           queryContainer.append(queryPre, copyButton, downloadButton);
             cardBody.append(queryContainer);
            card.append(cardHeader, cardBody);
            savedQueriesDiv.append(card);
        }
    }
     // 4. Clipboard and Download
    // Modified - Utility function
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
     // Modified - Utility function
    function showNotification(message, type) {
       const notificationDiv = $("#notification");
        notificationDiv.text(message);
        notificationDiv.removeClass("success error warn");
        notificationDiv.addClass(type);
        notificationDiv.fadeIn();
        setTimeout(() => notificationDiv.fadeOut(), 3000);
   }
     // Modified - Call collation with specific form
    function downloadQuery(query, queryForm) {
        const savedQuery = savedQuery(query, queryForm);
         const blob = new Blob([savedQuery], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
       a.download = `savedQuery_${queryForm}.txt`;
        document.body.appendChild(a);
       a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
   }
    // Modified - Iterate correctly with new format
   function downloadAllQueries(savedQueries) {
        let combinedText = "";
       const queryFormMap = {
            pubmedshort: "PubMed Short",
            pubmedfull: "PubMed Expanded",
       };
       for (const queryForm in savedQueries) {
            combinedText += `${queryFormMap[queryForm]}:\n${savedQueries[queryForm]}\n\n`;
        }
        const blob = new Blob([combinedText], { type: "text/plain" });
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
     // Modified - No Change Required
    function loadQueryHistory() {
        const history = localStorage.getItem('queryHistory');
        return history ? JSON.parse(history) : [];
    }
     // Modified - No Change Required
    function saveQueryHistory(history) {
        localStorage.setItem('queryHistory', JSON.stringify(history));
    }
    // Modified - No Change Required
    function clearQueryHistory() {
       localStorage.removeItem('queryHistory');
      $("#query-history-table tbody").empty();
   }
   // Modified - No Change Required
    function renderQueryHistoryTable(history) {
        const tableBody = $("#query-history-table tbody");
        tableBody.empty();
       history.forEach((entry, index) => {
            const date = new Date();
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           const formattedDate = date.toLocaleDateString();
            const row = `<tr data-index="${index}" style="cursor: pointer;"><td>#${index + 1}</td><td>${entry}</td><td>${formattedDate} ${formattedTime}</td><td><div class="history-actions"><button class="btn btn-info btn-sm edit-history-button">Edit</button>  <button class="btn btn-secondary btn-sm copy-history-button">Copy</button>   <button class="btn btn-danger btn-sm delete-history-button">Delete</button> <button class="btn btn-success btn-sm build-history-button">Build</button>  <button class="btn btn-primary btn-sm collate-history-button">Collate</button></div></td></tr>`;
            tableBody.append(row);
       });
    }
    // Modified - No Change Required
    function addToHistory(query) {
       const history = loadQueryHistory();
        history.push(query);
        saveQueryHistory(history);
       renderQueryHistoryTable(history);
    }
    // Modified - No Change Required
    function downloadQueryHistory() {
        const history = loadQueryHistory();
        const text = history.map((entry, index) => `#${index + 1}: ${entry}`).join('\n');
         const blob = new Blob([text], { type: 'text/plain' });
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
  
    function collateQueries(){
            const originalQuery = $("#query").val();
           const selectedqueryForm = $("#format-select").val();
           if (!selectedqueryForm) {
                showNotification("Please select a query format.", 'error');
                return;
            }
             const savedQueries = {};
            savedQueries[selectedqueryForm] = savedQuery(originalQuery, selectedqueryForm);
            renderSavedQueries(savedQueries);
        }
    $(document).ready(function () {
        //Load saved history to the table
        renderQueryHistoryTable(loadQueryHistory());
        // Short Form Input
        $(".add-field-button").click(function () {
           addInputField();
        });
       $(".boolean-radio").on("click", function () {
       });
         // Modified - Clear both short form input fields and the main query box
        $("#clearButton").click(function () {
             $("#query").val("");
            $(".query-builder-inputs").empty(); // Clear input fields
            addInputField();// Add a new empty input field
        });
       addInputField();
         // Short form delete field button
       $(".query-builder-inputs").on("click", ".delete-field-button", function () {
            $(this).closest(".input-group").remove();
           let query = collateShortForm();
            $("#query").val(query);
        });
       // Full Form Input
       //Modified - using the implemented history for query box.
        let queryHistory = [""];
        let historyIndex = 0;
       function addToHistoryToQueryBox(query) {
            if (queryHistory[historyIndex] !== query) {
                 queryHistory = queryHistory.slice(0, historyIndex + 1);
                 queryHistory.push(query);
                historyIndex++;
            }
           if (queryHistory.length > 10) {
                queryHistory = queryHistory.slice(queryHistory.length - 10);
               historyIndex = queryHistory.length - 1;
            }
        }
         $("#query").on("input", function () {
           addToHistoryToQueryBox($(this).val());
        });
        $("#query-box-controls").on("click", ".undo-query-button", function () {
           if (historyIndex > 0) {
               historyIndex--;
                $("#query").val(queryHistory[historyIndex]);
            }
       });
       $("#query-box-controls").on("click", ".redo-query-button", function () {
           if (historyIndex < queryHistory.length - 1) {
               historyIndex++;
                $("#query").val(queryHistory[historyIndex]);
           }
      });
        // Keyword Input
       $("#keyword-submit").click(function () {
            const query = collateKeyword();
            const selectedBoolean = $("input[name='keywordBooleanOperator']:checked").val();
            let currentQuery = $("#query").val();
            if (currentQuery) {
                $("#query").val(`${currentQuery} ${selectedBoolean} ${conditionallyAddBrackets(query)}`);
            } else {
                $("#query").val(query);
            }
       });
       $(".clear-keyword-button").on("click", function () {
            $("#keyword-input").val("");
       });
        //PICO Input
        $("#generate-pico-button").click(function () {
            const query = collatePICO();
             $("#query").val(query);
            addToHistory(query);
        });
        // File Upload
        $("#file-upload").change(async function (e) {
            try {
               const fileContent  = await collateFileUpload(e);
                 $("#query").data("fileContent", fileContent); //store to data attribute
            } catch (err) {
                console.error("File reading error:", err);
                showNotification("Error reading file. Please try again.", 'error');
            }
       });
        $("#upload-file-button").click(function(){
            const fileContent =  $("#query").data("fileContent");
            if(fileContent){
               showNotification("Loaded file contents, and ready to build query. Please note this will clear existing contents of the query box!", "warn");
                $("#query").val(fileContent);
           } else {
               showNotification("No file has been selected.", 'warn');
            }
        })
        // Query box buttons
       $("#query-box-controls").append(
           '<button class="btn btn-secondary clear-query-button">Clear</button>',
            '<button class="btn btn-info copy-query-button">Copy</button>',
           '<button class="btn btn-secondary paste-query-button">Paste</button>',
           '<button class="btn btn-secondary undo-query-button">Undo</button>',
           '<button class="btn btn-secondary redo-query-button">Redo</button>',
            '<button class="btn btn-primary build-query-button">Build</button>'
       );
       $("#query-box-controls").on("click", ".clear-query-button", function () {
            $("#query").val("");
           queryHistory = [""];
            historyIndex = 0;
      });
       $("#query-box-controls").on("click", ".copy-query-button", function () {
            copyToClipboard($("#query").val());
       });
        $("#query-box-controls").on("click", ".paste-query-button", async function () {
            try {
               const text = await navigator.clipboard.readText();
                 $("#query").val(text);
           } catch (err) {
                console.error("Failed to read clipboard contents: ", err);
                showNotification("Failed to paste from clipboard", "error");
           }
      });
        $("#query-box-controls").on("click", ".undo-query-button", function () {
            if (historyIndex > 0) {
                 historyIndex--;
                $("#query").val(queryHistory[historyIndex]);
            }
       });
        $("#query-box-controls").on("click", ".redo-query-button", function () {
            if (historyIndex < queryHistory.length - 1) {
                historyIndex++;
                $("#query").val(queryHistory[historyIndex]);
           }
       });
        // Translate Button
       $("#queryDisplay").click(function () {
           collateQueries();
        });
        // Download All Button
        $("#download-all-button").click(function () {
            const originalQuery = $("#query").val();
           const selectedqueryForm = $("#format-select").val();
            if (!selectedqueryForm) {
                showNotification("Please select a query format.", 'error');
               return;
            }
           const savedQueries = {};
            savedQueries[selectedqueryForm] = savedQuery(originalQuery, selectedqueryForm);
            downloadAllQueries(savedQueries);
       });
       // Copy functionality (delegated event handling)
        $("#constructed-queries").on("click", ".copy-button", function () {
           const queryToCopy = $(this).prev("pre").text();
           copyToClipboard(queryToCopy);
        });
         // Download functionality (delegated event handling)
        $("#constructed-queries").on("click", ".download-button", function () {
            const query = $("#query").val();
            const queryForm = $(this).data("queryForm");
            downloadQuery(query, queryForm);
       });
       // Clear Query History
      $(".clear-history-button").on("click", function () {
            clearQueryHistory();
       });
        // Download Query History
      $(".download-history-button").on("click", function () {
            downloadQueryHistory();
       });
       // Access history from table
       $("#query-history-table").on("click", "tr", function () {
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
       $("#add-to-query-button").on("click", function () {
           const currentQuery = $("#query").val();
           if (currentQuery) {
               addToHistory(currentQuery);
           }
      });
        $("#query-history-table").on("click", ".edit-history-button", function (event) {
            event.stopPropagation();
          const index = $(this).closest("tr").data("index");
            const history = loadQueryHistory();
            if (history && history[index]) {
                $("#query").val(history[index]);
                showNotification(`Loaded history entry #${index + 1} to query box for editing`, 'success');
           }
        });
        $("#query-history-table").on("click", ".copy-history-button", function (event) {
           event.stopPropagation();
            const index = $(this).closest("tr").data("index");
          const history = loadQueryHistory();
           if (history && history[index]) {
                copyToClipboard(history[index]);
            }
        });
      $("#query-history-table").on("click", ".delete-history-button", function (event) {
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
       $("#query-history-table").on("click", ".build-history-button", function (event) {
          event.stopPropagation();
          const index = $(this).closest("tr").data("index");
          const history = loadQueryHistory();
           if (history && history[index]) {
               $("#query").val(history[index]);
               showNotification(`Loaded history entry #${index + 1} to query box`, 'success');
           }
      });
       $("#query-history-table").on("click", ".collate-history-button", function (event) {
          event.stopPropagation();
          const index = $(this).closest("tr").data("index");
           const history = loadQueryHistory();
           if (history && history[index]) {
              const originalQuery = history[index];
                const selectedqueryForm = $("#format-select").val();
               if (!selectedqueryForm) {
                   showNotification("Please select a query format.", 'error');
                   return;
                }
               const savedQueries = {};
               savedQueries[selectedqueryForm] = savedQuery(originalQuery, selectedqueryForm);
               renderSavedQueries(savedQueries);
           }
       });
    });
})();