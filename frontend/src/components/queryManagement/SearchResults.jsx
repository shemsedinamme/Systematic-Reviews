import React, { useState, useEffect } from 'react';
import styles from './SearchResults.module.css';
import config from '../config';
import { useNotification } from './useNotification';

const SearchResults = ({ searchQuery, selectedDatabases }) => {
    const [searchResults, setSearchResults] = useState([]);
    const [sortOption, setSortOption] = useState('relevance');
     const { showNotification } = useNotification();
    const token = localStorage.getItem('token');


    useEffect(() => {
        const fetchResults = async () => {
             if(!searchQuery) return;
            try {
                const response = await fetch(
                    `${config.apiBaseUrl}/articles?query=${searchQuery}`,
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
                    setSearchResults(data);
                } else {
                   const errorData = await response.json();
                     showNotification({type: 'error', message: `Failed to fetch search results: ${errorData.message}`});
                   console.error('Failed to fetch search results');
               }
            } catch (error) {
                 showNotification({type: 'error', message: `Error fetching search results: ${error.message}`});
                console.error('Error fetching search results:', error);
            }
        };
        if (searchQuery) {
           fetchResults();
       }
    }, [searchQuery, selectedDatabases, showNotification, token]);//Include showNotification and token in dependency array

    const handleSortChange = (e) => {
      setSortOption(e.target.value)
    };
     const handleExport = async (exportFormat) => {
        try {
           const response = await fetch(
               `${config.apiBaseUrl}/search/results/export?format=${exportFormat}`,
               {
                  method: 'GET',
                  headers: {
                       'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                  },
               }
           );
           if (response.ok) {
               const blob = await response.blob();
               const url = window.URL.createObjectURL(blob);
             const a = document.createElement('a');
                a.href = url;
               a.download = `search_results.${exportFormat}`;
                document.body.appendChild(a);
               a.click();
                window.URL.revokeObjectURL(url);
               document.body.removeChild(a);
             } else {
                  const errorData = await response.json();
                 showNotification({type: 'error', message: `Failed to export results: ${errorData.message}`});
                  console.error('Failed to export results');
            }
       } catch (error) {
            showNotification({type: 'error', message: `Error exporting search results: ${error.message}`});
           console.error('Error exporting search results:', error);
       }
  };


    const sortedResults = [...searchResults].sort((a, b) => {
        if (sortOption === 'date') {
            return new Date(b.publication_date) - new Date(a.publication_date);
        }
        return 0;
    });

    return (
        <div className={styles.searchResultsContainer}>
            <h1>Search Results</h1>
           {searchQuery ?(
                <>
                   <div className={styles.sortExport}>
                        <select
                            value={sortOption}
                           onChange={handleSortChange}
                            className={styles.sortSelect}
                        >
                             <option value="relevance">Sort by Relevance</option>
                             <option value="date">Sort by Date</option>
                        </select>
                        <button onClick={() => handleExport('csv')} className={styles.exportButton}>
                           Export CSV
                        </button>
                         <button onClick={() => handleExport('ris')} className={styles.exportButton}>
                             Export RIS
                         </button>
                         <button onClick={() => handleExport('bibtex')} className={styles.exportButton}>
                            Export BibTeX
                         </button>
                   </div>
                 <ul className={styles.resultsList}>
                      {sortedResults.map((result) => (
                            <li key={result.article_id} className={styles.resultItem}>
                                <h3>{result.title}</h3>
                               <p>Authors: {result.authors}</p>
                                <p>Abstract: {result.abstract}</p>
                                <p>Published Date: {new Date(result.publication_date).toLocaleDateString()}</p>
                           </li>
                        ))}
                  </ul>
               </>
           ) : (
                <p>Please enter a query to view results</p>
            )}
        </div>
    );
};

export default SearchResults;