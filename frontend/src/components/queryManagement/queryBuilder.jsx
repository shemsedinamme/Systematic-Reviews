//queryBuilder.jsx
import React, { useState, useEffect } from 'react';
import styles from './queryBuilder.module.css';

const QueryBuilder = () => {
  const [query, setQuery] = useState('');
  const [inputFields, setInputFields] = useState([{ field: 'tiab', term: '' }]);
  const [booleanOperator, setBooleanOperator] = useState('AND');
  const [queryHistory, setQueryHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);

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

  const collateShortForm = () => {
    let terms = inputFields.map(field => {
      let formattedTerm = field.term.includes(' ') ? `"${field.term}"` : field.term;
      return `${formattedTerm}[${field.field}]`;
    }).join(` ${booleanOperator} `);

    setQuery(terms);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const addToHistory = (newQuery) => {
    const newHistory = [...queryHistory, newQuery];
    setQueryHistory(newHistory);
    localStorage.setItem('queryHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setQueryHistory([]);
    localStorage.removeItem('queryHistory');
  };

  return (
    <div className={styles.queryBuilderContainer}>
            <h1>Search Query Builder</h1>
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
            <div className="query-actions">
                <button type="button" className="btn btn-primary add-field-button" onClick={addInputField}>Add Field</button>
                <div className="btn-group" role="group" aria-label="Boolean Operators">
                    <input type="radio" className="btn-check boolean-radio" name="booleanOperator" id="andRadio" value="AND" checked={booleanOperator === 'AND'} onChange={(e) => setBooleanOperator(e.target.value)} />
                    <label className="btn btn-outline-primary" htmlFor="andRadio">AND</label>

                    <input type="radio" className="btn-check boolean-radio" name="booleanOperator" id="orRadio" value="OR" checked={booleanOperator === 'OR'} onChange={(e) => setBooleanOperator(e.target.value)} />
                    <label className="btn btn-outline-primary" htmlFor="orRadio">OR</label>

                    <input type="radio" className="btn-check boolean-radio" name="booleanOperator" id="notRadio" value="NOT" checked={booleanOperator === 'NOT'} onChange={(e) => setBooleanOperator(e.target.value)} />
                    <label className="btn btn-outline-primary" htmlFor="notRadio">NOT</label>
                </div>
            </div>
            <div className="form-group mt-3">
                <label htmlFor="query">Query:</label>
                <textarea className="form-control" id="query" rows="4" value={query} onChange={handleQueryChange}></textarea>
                <button className="btn btn-primary mt-2" onClick={collateShortForm}>Build Query</button>
                <button className="btn btn-secondary mt-2" onClick={() => addToHistory(query)}>Add To History</button>
            </div>
            <div className="mt-4">
                <h2>Your Query History</h2>
                <button className="btn btn-danger btn-sm" onClick={clearHistory}>Clear History</button>
                <ul>
                    {queryHistory.map((entry, index) => (
                        <li key={index}>{entry}</li>
                    ))}
                </ul>
            </div>
        </div>
  );
};

export default QueryBuilder;
