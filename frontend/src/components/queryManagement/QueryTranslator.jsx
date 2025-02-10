import React, { useState, useEffect } from 'react';
import styles from './QueryTranslator.module.css';

const QueryTranslator = () => {
  const [query, setQuery] = useState('');
  const [inputFields, setInputFields] = useState([{ field: 'tiab', term: '' }]);
  const [booleanOperator, setBooleanOperator] = useState('AND');
  const [queryHistory, setQueryHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [translatedQueries, setTranslatedQueries] = useState({});
  const [selectedDatabases, setSelectedDatabases] = useState([]);

  const databaseMap = {
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

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('queryHistory')) || [];
    setQueryHistory(savedHistory);
  }, []);

  const addInputField = () => {
    setInputFields([...inputFields, { field: 'tiab', term: '' }]);
  };

  const handleInputChange = (index, event) => {
    const newInputFields = inputFields.slice();
    newInputFields[index][event.target.name] = event.target.value;
    setInputFields(newInputFields);
  };

  const deleteInputField = (index) => {
    const newInputFields = inputFields.slice();
    newInputFields.splice(index, 1);
    setInputFields(newInputFields);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleDatabaseSelection = (event) => {
    const { value, checked } = event.target;
    setSelectedDatabases(prev =>
      checked ? [...prev, value] : prev.filter(db => db !== value)
    );
  };

  const handleBooleanChange = (event) => {
    setBooleanOperator(event.target.value);
  };

  const translateQuery = (query, database) => {
    // Translation logic goes here (use the logic from sqtr.js)
    return applyRules(query, database);
  };

  const applyRules = (query, database) => {
    const rules = {
      // Add rules from sqtr.js here
    };

    let translatedQuery = query;
    const translationRules = rules[database.toLowerCase()];
    if (translationRules) {
      translationRules.forEach(rule => {
        translatedQuery = translatedQuery.replace(new RegExp(rule.regexFrom, 'gi'), rule.regexTo);
      });
    }
    return translatedQuery;
  };

  const translateQueries = () => {
    if (selectedDatabases.length === 0) {
      showNotification("Please select at least one database.", 'error');
      return;
    }

    const newTranslatedQueries = {};
    selectedDatabases.forEach(database => {
      newTranslatedQueries[database] = translateQuery(query, database);
    });
    setTranslatedQueries(newTranslatedQueries);
  };

  const showNotification = (message, type) => {
    const notificationDiv = document.querySelector("#notification");
    notificationDiv.textContent = message;
    notificationDiv.className = `${styles.notification} ${styles[type]}`;
    notificationDiv.style.display = 'block';
    setTimeout(() => {
      notificationDiv.style.display = 'none';
    }, 3000);
  };

  return (
    <div className={styles.container}>
            <header>
                <div className={styles.container}>
                    <div id="branding">
                        <h1><span className={styles.highlight}>ARMS</span> Review Hub - SqTr</h1>
                    </div>
                    <nav>
                        <ul>
                            <li><a href="home.html">Home</a></li>
                            <li className={styles.current}><a href="sqtr.html">SqTb Builder</a></li>
                            <li><a href="sqtb_app.html">SqTr Translator</a></li>
                        </ul>
                    </nav>
                </div>
            </header>

            <section id="newsletter">
                <div className={styles.container}>
                    <h1 style={{ textAlign: 'center' }}>Subscribe To Our Updates</h1>
                    <form>
                        <input type="email" placeholder="Enter Email..." required />
                        <button type="submit" className={styles.button_1}>Subscribe</button>
                    </form>
                </div>
            </section>

            <div className={`${styles.container} mt-4`}>
                <h1>SqTr Search Translator</h1>
                <p>Need help? Please refer to our <a href="user-guide.html">User Guide</a> for detailed instructions.</p>
                <p>If you are looking for query building tool, please access<a href="sqtb.html">SqTb - Query Builder tool here.</a>.</p>
                <div className="card mb-4">
                    <div className="card-header">Input Query</div>
                    <div className="card-body">
                        <ul className="nav nav-tabs" id="inputTabs" role="tablist">
                            <li className="nav-item">
                                <a className="nav-link active" id="short-form-tab" data-toggle="tab" href="#short-form" role="tab" aria-controls="short-form" aria-selected="true">Short Form</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" id="keyword-tab" data-toggle="tab" href="#keyword-input-section" role="tab" aria-controls="keyword-input-section" aria-selected="false">Keywords</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" id="pico-tab" data-toggle="tab" href="#pico-input-section" role="tab" aria-controls="pico-input-section" aria-selected="false">PICO Builder</a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" id="file-upload-tab" data-toggle="tab" href="#file-upload-section" role="tab" aria-controls="file-upload-section" aria-selected="false">File Upload</a>
                            </li>
                        </ul>
                        <div className="tab-content" id="inputTabsContent">
                            <div className="tab-pane fade show active" id="short-form" role="tabpanel" aria-labelledby="short-form-tab">
                                <div className="query-builder-inputs">
                                    {inputFields.map((input, index) => (
                                        <div key={index} className="input-group mb-2">
                                            <select
                                                className="form-control field-select"
                                                name="field"
                                                value={input.field}
                                                onChange={(e) => handleInputChange(index, e)}
                                            >
                                                <option value="tiab">Title/Abstract</option>
                                                <option value="tw">Text Word</option>
                                                <option value="mesh">MeSH Terms</option>
                                            </select>
                                            <input
                                                type="text"
                                                className="form-control term-input"
                                                name="term"
                                                value={input.term}
                                                onChange={(e) => handleInputChange(index, e)}
                                                placeholder="Search term"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-danger delete-field-button"
                                                onClick={() => deleteInputField(index)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="query-actions mt-2 d-flex align-items-center">
                                    <div className="form-check form-check-inline">
                                        <input className="form-check-input boolean-radio" type="radio" name="booleanOperator" id="andRadio" value="AND" checked={booleanOperator === 'AND'} onChange={handleBooleanChange} />
                                        <label className="form-check-label" htmlFor="andRadio">AND</label>
                                    </div>
                                    <div className="form-check form-check-inline">
                                        <input className="form-check-input boolean-radio" type="radio" name="booleanOperator" id="orRadio" value="OR" checked={booleanOperator === 'OR'} onChange={handleBooleanChange} />
                                        <label className="form-check-label" htmlFor="orRadio">OR</label>
                                    </div>
                                    <div className="form-check form-check-inline">
                                        <input className="form-check-input boolean-radio" type="radio" name="booleanOperator" id="notRadio" value="NOT" checked={booleanOperator === 'NOT'} onChange={handleBooleanChange} />
                                        <label className="form-check-label" htmlFor="notRadio">NOT</label>
                                    </div>
                                    <button type="button" className="btn btn-primary add-field-button" onClick={addInputField}>Add Field</button>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="keyword-input-section" role="tabpanel" aria-labelledby="keyword-tab">
                                <div className="form-group">
                                    <label htmlFor="keyword-input">Enter keywords (separated by spaces):</label>
                                    <input type="text" className="form-control" id="keyword-input" placeholder="e.g., cancer therapy genes" />
                                    <button type="button" className="btn btn-primary mt-2" id="keyword-submit">Submit Keywords</button>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="pico-input-section" role="tabpanel" aria-labelledby="pico-tab">
                                <div className="pico-input-section">
                                    <label htmlFor="population">Population:</label>
                                    <input type="text" className="form-control" id="population" aria-describedby="population-help" />
                                    <label htmlFor="intervention">Intervention:</label>
                                    <input type="text" className="form-control" id="intervention" aria-describedby="intervention-help" />
                                    <label htmlFor="comparison">Comparison:</label>
                                    <input type="text" className="form-control" id="comparison" aria-describedby="comparison-help" />
                                    <label htmlFor="outcome">Outcome:</label>
                                    <input type="text" className="form-control" id="outcome" aria-describedby="outcome-help" />
                                    <button type="button" className="btn btn-primary generate-pico-button" id="generate-pico-button">Generate Query</button>
                                    <textarea className="form-control mt-2" id="generated-pico-query" rows="3" readOnly aria-label="Generated PICO query"></textarea>
                                </div>
                            </div>
                            <div className="tab-pane fade" id="file-upload-section" role="tabpanel" aria-labelledby="file-upload-tab">
                                <div className="form-group">
                                    <label htmlFor="file-upload">Upload a text file:</label>
                                    <input type="file" className="form-control-file" id="file-upload" accept=".txt" />
                                    <button type="button" className="btn btn-primary upload-file-button mt-2" id="upload-file-button">Upload File</button>
                                </div>
                            </div>
                        </div>
                        <div className="form-group mt-3 d-flex align-items-center">
                            <label htmlFor="query" style={{ marginRight: '10px' }}>Query:</label>
                            <textarea className="form-control flex-grow-1" id="query" rows="4" value={query} onChange={handleQueryChange}></textarea>
                            <button className="btn btn-secondary ml-2" id="add-to-query-button">Add To History</button>
                        </div>
                        <div id="query-box-controls" className="mt-2"></div>
                    </div>
                </div>
                <div className="mt-4">
                    <h2>Your Query History</h2>
                    <div className="d-flex justify-content-between mb-2">
                        <div></div> {/* Placeholder for left alignment */}
                        <div>
                            <button className="btn btn-danger btn-sm clear-history-button mr-2" id="clear-history-button" aria-role="button">Clear History</button>
                            <button className="btn btn-success btn-sm download-history-button" id="download-history-button" aria-role="button">Download History</button>
                        </div>
                    </div>
                    <table className="table table-bordered" id="query-history-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Query</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Query history entries will be inserted here */}
                        </tbody>
                    </table>
                </div>
                <div className="card mb-4">
                    <div className="card-header">Select Databases</div>
                    <div className="card-body">
                        {Object.keys(databaseMap).map((db, index) => (
                            <div key={index} className="form-check form-check-inline">
                                <input className="form-check-input" type="checkbox" id={db} value={db} onChange={handleDatabaseSelection} />
                                <label className="form-check-label" htmlFor={db}>
                                    <a href={databaseMap[db]}>{databaseMap[db]}</a>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <button className="btn btn-secondary" id="select-all-button">Select All</button>
                    <div>
                        <button className="btn btn-danger" id="deselect-all-button">Deselect All</button>
                    </div>
                    <button className="btn btn-primary" id="translate-button" onClick={translateQueries}>Translate</button>
                    <button className="btn btn-success" id="download-all-button">Download All</button>
                </div>
                <div id="notification" className="notification"></div>
                <div id="translated-queries" className="mt-4"></div>
            </div>
            <footer>
                <p>© 2025 ARMS. All Rights Reserved.</p>
            </footer>
        </div>
  );
};

export default QueryTranslator;