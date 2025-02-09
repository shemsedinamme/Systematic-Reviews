import React, { useState, useEffect } from 'react';
import styles from './SearchQueryBuilder.module.css';
import config from '../config';
import { useNotification } from './useNotification';
const SearchQueryBuilder = ({ selectedDatabases }) => {
    const [searchFields, setSearchFields] = useState([
        { id: 1, label: 'Title', code: 'title' },
        { id: 2, label: 'Abstract', code: 'abstract' },
        { id: 3, label: 'Author', code: 'author' },
        { id: 4, label: 'Journal', code: 'journal' },
        { id: 5, label: 'MESH Terms', code: 'mesh' },
    ]);
    const [query, setQuery] = useState('');
    const [field, setField] = useState('title');
    const [searchTerm, setSearchTerm] = useState('');
    const [savedQueries, setSavedQueries] = useState([]);
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchSavedQueries = async () => {
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/search/query-builder`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                if (response.ok) {
                   const data = await response.json();
                     setSavedQueries(data);
                 } else {
                      const errorData = await response.json();
                       showNotification({type: 'error', message: `Failed to fetch saved queries: ${errorData.message}`});
                      console.error('Failed to fetch saved queries');
                 }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching saved queries: ${error.message}`});
                console.error('Error fetching saved queries:', error);
            }
        };
       fetchSavedQueries();
    }, [showNotification, token]); //Include showNotification in dependency array


    const handleAddField = () => {
      if(!searchTerm) return;
       setQuery((prevQuery) =>
           prevQuery ? `${prevQuery} ${field}:(${searchTerm})` : `${field}:(${searchTerm})`
        );
        setSearchTerm('');
    };

    const handleAddBoolean = (operator) => {
        setQuery((prevQuery) => `${prevQuery} ${operator}`);
    };
    const handleSaveQuery = async () => {
        try {
            const response = await fetch(
                `${config.apiBaseUrl}/search/query-builder`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ search_query: query, databases: selectedDatabases }),
                }
            );
           if (response.ok) {
                const data = await response.json();
                showNotification({type: 'success', message: 'Query saved successfully'});
               setSavedQueries([...savedQueries, data]);
           } else {
                const errorData = await response.json();
                showNotification({type: 'error', message: `Failed to save query: ${errorData.message}`});
                console.error('Failed to save query');
           }
      } catch (error) {
         showNotification({type: 'error', message: `Error saving query: ${error.message}`});
            console.error('Error saving query:', error);
       }
    };

  const handleSearch = async () => {
      try {
          const response = await fetch(
              `${config.apiBaseUrl}/articles?query=${query}`,
              {
                  method: 'GET',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                   },
                }
            );
           if (response.ok) {
               const data = await response.json();
              console.log('Search Result', data);
             showNotification({type: 'success', message: 'Search Successful, results in console log'});
           } else {
              const errorData = await response.json();
                 showNotification({type: 'error', message: `Search failed: ${errorData.message}`});
               console.error('Search failed:', response);
          }
      } catch (error) {
           showNotification({type: 'error', message: `An error occurred while searching: ${error.message}`});
          console.error('Error searching:', error);
     }
  };


    return (
        <div className={styles.queryBuilderContainer}>
            <h1>Search Query Builder</h1>
            <div className={styles.queryForm}>
               <select
                   value={field}
                   onChange={(e) => setField(e.target.value)}
                   className={styles.selectInput}
               >
                    {searchFields.map(searchField =>(
                       <option key={searchField.id} value={searchField.code}>{searchField.label}</option>
                     ))}
               </select>
              <input
                   type="text"
                   placeholder="Search term"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className={styles.queryInput}
               />
                <button onClick={handleAddField} className={styles.addButton}>
                    Add field
                </button>
            </div>
            <div className={styles.queryActions}>
                <button onClick={() => handleAddBoolean('AND')} className={styles.booleanButton}>
                    AND
                </button>
                <button onClick={() => handleAddBoolean('OR')} className={styles.booleanButton}>
                    OR
                </button>
                <button onClick={() => handleAddBoolean('NOT')} className={styles.booleanButton}>
                    NOT
                </button>
            </div>
            <div className={styles.queryDisplay}>
                 <textarea
                    value={query}
                   placeholder="Generated Query"
                    readOnly
                     className={styles.queryTextarea}
                 />
             </div>
            <div className={styles.saveAndSearch}>
                <button onClick={handleSaveQuery} className={styles.saveButton}>
                    Save Query
                </button>
                <button onClick={handleSearch} className={styles.searchButton}>
                    Search
                </button>
           </div>
           <div className={styles.savedQueries}>
               <h2>Saved Queries</h2>
               <ul>
                   {savedQueries.map(savedQuery => (
                     <li key={savedQuery.search_query_id}>{savedQuery.search_query}</li>
                   ))}
               </ul>
           </div>
       </div>
    );
};

export default SearchQueryBuilder;